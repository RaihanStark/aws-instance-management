<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	interface EC2Instance {
		id: string;
		name: string;
		type: string;
		state: 'running' | 'stopped' | 'pending' | 'stopping' | 'terminated';
		publicIp: string;
		launchTime: string;
		platform: 'Linux' | 'Windows';
		billing?: {
			currentSessionHours: number;
			currentSessionCost: number;
			monthlyHours: number;
			monthlyCost: number;
		};
	}

	let totalMonthlyCost = 0;
	let totalMonthlyHours = 0;
	let totalSessionCost = 0;

	let instances: EC2Instance[] = [];
	let loading = true;
	let loadingBilling = true;
	let loadingPricing = true;
	let actionLoading: { [key: string]: boolean } = {};
	let pricingRates: { [key: string]: number } = {};

	async function loadPricingRates(instances: EC2Instance[]) {
		if (instances.length === 0) return;

		loadingPricing = true;
		try {
			// Create unique list of instance type + platform combinations
			const uniqueInstances = instances.reduce(
				(acc, inst) => {
					const key = `${inst.type}-${inst.platform}`;
					if (!acc.some((i) => `${i.type}-${i.platform}` === key)) {
						acc.push({ type: inst.type, platform: inst.platform });
					}
					return acc;
				},
				[] as Array<{ type: string; platform: 'Linux' | 'Windows' }>
			);

			const response = await fetch('/api/pricing', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ instances: uniqueInstances })
			});

			const data = await response.json();

			if (response.ok) {
				pricingRates = data.rates;
			} else {
				console.error('Failed to load pricing:', data.error);
			}
		} catch (error) {
			console.error('Error loading pricing:', error);
		} finally {
			loadingPricing = false;
		}
	}

	async function loadBillingData() {
		loadingBilling = true;
		try {
			const response = await fetch('/api/billing');
			const data = await response.json();

			if (response.ok) {
				totalMonthlyHours = data.totalHours;
				totalMonthlyCost = data.totalCost;
			} else {
				console.error('Failed to load billing data:', data.error);
			}
		} catch (error) {
			console.error('Error loading billing data:', error);
		} finally {
			loadingBilling = false;
		}
	}

	async function loadInstances() {
		loading = true;
		try {
			const response = await fetch('/api/instances');
			const data = await response.json();

			if (response.ok) {
				instances = data.instances;

				// Load pricing rates for all instances (with their platforms)
				await loadPricingRates(instances);

				// Calculate session costs for each instance
				recalculateSessionCosts();
			} else {
				console.error('Failed to load instances:', data.error);
			}
		} catch (error) {
			console.error('Error loading instances:', error);
		} finally {
			loading = false;
		}
	}

	function recalculateSessionCosts() {
		instances = instances.map((instance) => {
			// Calculate uptime from launchTime (in hours, with decimals)
			const currentSessionHours =
				instance.state === 'running'
					? (Date.now() - new Date(instance.launchTime).getTime()) / (1000 * 60 * 60)
					: 0;

			// Get hourly rate from AWS Pricing API using type-platform key
			const rateKey = `${instance.type}-${instance.platform}`;
			const hourlyRate = pricingRates[rateKey] || 0;

			// Calculate current session cost
			const currentSessionCost = currentSessionHours * hourlyRate;

			return {
				...instance,
				billing: {
					currentSessionHours,
					currentSessionCost,
					monthlyHours: instance.billing?.monthlyHours || 0,
					monthlyCost: instance.billing?.monthlyCost || 0
				}
			};
		});

		// Calculate total session cost
		totalSessionCost = instances.reduce(
			(sum, inst) => sum + (inst.billing?.currentSessionCost || 0),
			0
		);
	}

	onMount(() => {
		loadInstances();
		loadBillingData();

		// Update costs every 30 seconds for running instances
		const interval = setInterval(() => {
			if (instances.some((i) => i.state === 'running')) {
				recalculateSessionCosts();
			}
		}, 30000); // Update every 30 seconds

		return () => clearInterval(interval);
	});

	async function handleLogout() {
		try {
			await fetch('/api/logout', {
				method: 'POST'
			});
		} catch (err) {
			console.error('Logout error:', err);
		} finally {
			goto('/');
		}
	}

	async function handleAction(instanceId: string, action: 'start' | 'stop') {
		actionLoading[instanceId] = true;

		try {
			const endpoint = action === 'start' ? '/api/instances/start' : '/api/instances/stop';
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ instanceId })
			});

			if (response.ok) {
				// Update instance state optimistically
				const instance = instances.find((i) => i.id === instanceId);
				if (instance) {
					instance.state = action === 'start' ? 'pending' : 'stopping';
					instances = [...instances];
				}

				// Reload instances after a short delay to get updated state
				setTimeout(() => {
					loadInstances();
				}, 2000);
			} else {
				const data = await response.json();
				console.error(`Failed to ${action} instance:`, data.error);
			}
		} catch (error) {
			console.error(`Error ${action}ing instance:`, error);
		} finally {
			actionLoading[instanceId] = false;
		}
	}

	function getStateBgColor(state: string): string {
		const colors = {
			running: 'bg-[#067f68]',
			stopped: 'bg-[#d13212]',
			pending: 'bg-[#ff9900]',
			stopping: 'bg-[#ff9900]',
			terminated: 'bg-[#545b64]'
		};
		return colors[state as keyof typeof colors] || 'bg-[#545b64]';
	}
</script>

<svelte:head>
	<style>
		body {
			margin: 0;
			padding: 0;
			font-family: 'Amazon Ember', 'Helvetica Neue', Arial, sans-serif;
			background: #f2f3f3;
		}
	</style>
</svelte:head>

<div class="min-h-screen">
	<header class="bg-[#232f3e] text-white shadow-md">
		<div class="mx-auto flex items-center justify-between px-6 py-4">
			<div class="flex items-center gap-3">
				<div class="block">
					<svg width="32" height="32" viewBox="0 0 40 40" fill="none">
						<rect width="40" height="40" rx="4" fill="#FF9900" />
						<path d="M20 10L30 15V25L20 30L10 25V15L20 10Z" fill="white" />
					</svg>
				</div>
				<h1 class="m-0 text-lg font-medium text-white">AWS Instance Manager</h1>
			</div>
			<button
				class="cursor-pointer rounded border border-[#aab7b8] bg-transparent px-4 py-1.5 text-sm text-white transition-all hover:border-white hover:bg-white/10"
				on:click={handleLogout}
			>
				Sign out
			</button>
		</div>
	</header>

	<main class="p-6">
		<!-- Monthly Cost Summary -->
		<div class="mx-auto mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
			<div class="rounded-lg bg-white p-6 shadow">
				<div class="mb-1 text-sm font-medium text-[#545b64]">Current Session Cost</div>
				<div class="text-3xl font-semibold text-[#067f68]">${totalSessionCost.toFixed(4)}</div>
				<div class="mt-1 text-xs text-[#879596]">Real-time • Updates every 30s</div>
			</div>
			<div class="rounded-lg bg-white p-6 shadow">
				<div class="mb-1 text-sm font-medium text-[#545b64]">Total Monthly Hours</div>
				<div class="text-3xl font-semibold text-[#16191f]">{totalMonthlyHours.toFixed(1)}</div>
				<div class="mt-1 text-xs text-[#879596]">From AWS • 24-48h delay</div>
			</div>
			<div class="rounded-lg bg-white p-6 shadow">
				<div class="mb-1 text-sm font-medium text-[#545b64]">Total Monthly Cost</div>
				<div class="text-3xl font-semibold text-[#ff9900]">${totalMonthlyCost.toFixed(2)}</div>
				<div class="mt-1 text-xs text-[#879596]">From AWS • 24-48h delay</div>
			</div>
			<div class="rounded-lg bg-white p-6 shadow">
				<div class="mb-1 text-sm font-medium text-[#545b64]">Active Instances</div>
				<div class="text-3xl font-semibold text-[#067f68]">
					{instances.filter((i) => i.state === 'running').length}
				</div>
				<div class="mt-1 text-xs text-[#879596]">Real-time • Live count</div>
			</div>
		</div>

		<div class="mx-auto overflow-hidden rounded-lg bg-white shadow">
			<div class="flex items-start justify-between border-b border-[#e9ecef] p-6">
				<div>
					<h2 class="m-0 mb-1 text-2xl font-medium text-[#16191f]">EC2 Instances</h2>
					<p class="m-0 text-sm text-[#545b64]">Manage your Amazon EC2 instances</p>
				</div>
				<button
					class="rounded bg-[#ff9900] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#ec7211] disabled:cursor-not-allowed disabled:bg-[#aab7b8]"
					on:click={() => {
						loadInstances();
						loadBillingData();
					}}
					disabled={loading || loadingBilling}
				>
					{loading || loadingBilling ? 'Refreshing...' : 'Refresh'}
				</button>
			</div>

			{#if loading}
				<div class="py-15 text-center text-[#545b64]">
					<div
						class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#e9ecef] border-t-[#ff9900]"
					></div>
					<p>Loading instances...</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full border-collapse text-sm">
						<thead class="border-b-2 border-[#e9ecef] bg-[#fafafa]">
							<tr>
								<th
									class="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-[#16191f]"
									>Name</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-[#16191f]"
									>Instance ID</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-[#16191f]"
									>Type</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-[#16191f]"
									>Hourly Rate</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-[#16191f]"
									>Status</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-[#16191f]"
									>Public IP</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-[#16191f]"
									>Session Uptime</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-[#16191f]"
									>Session Cost</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-[#16191f]"
									>Monthly Hrs</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-[#16191f]"
									>Monthly Cost</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-[#16191f]"
									>Actions</th
								>
							</tr>
						</thead>
						<tbody>
							{#each instances as instance}
								<tr class="transition-colors hover:bg-[#fafafa]">
									<td class="border-b border-[#e9ecef] px-4 py-4 text-[#16191f]">
										<span class="font-medium">{instance.name}</span>
									</td>
									<td class="border-b border-[#e9ecef] px-4 py-4 text-[#16191f]">
										<span class="font-mono text-xs text-[#545b64]">{instance.id}</span>
									</td>
									<td class="border-b border-[#e9ecef] px-4 py-4 text-[#16191f]">{instance.type}</td
									>
									<td class="border-b border-[#e9ecef] px-4 py-4 text-[#16191f]">
										{#if loadingPricing}
											<span class="text-xs text-[#879596]">Loading...</span>
										{:else}
											<span class="font-medium text-[#545b64]">
												${(pricingRates[`${instance.type}-${instance.platform}`] || 0).toFixed(
													4
												)}/hr
											</span>
										{/if}
									</td>
									<td class="border-b border-[#e9ecef] px-4 py-4 text-[#16191f]">
										<span
											class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white {getStateBgColor(
												instance.state
											)}"
										>
											<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-white"></span>
											{instance.state.charAt(0).toUpperCase() + instance.state.slice(1)}
										</span>
									</td>
									<td class="border-b border-[#e9ecef] px-4 py-4 text-[#16191f]"
										>{instance.publicIp}</td
									>
									<td class="border-b border-[#e9ecef] px-4 py-4 text-[#16191f]">
										<span class="font-medium text-[#16191f]">
											{instance.billing?.currentSessionHours
												? instance.billing.currentSessionHours.toFixed(2)
												: '0.00'}h
										</span>
									</td>
									<td class="border-b border-[#e9ecef] px-4 py-4 text-[#16191f]">
										<span class="font-semibold text-[#067f68]">
											${instance.billing?.currentSessionCost
												? instance.billing.currentSessionCost.toFixed(4)
												: '0.0000'}
										</span>
									</td>
									<td class="border-b border-[#e9ecef] px-4 py-4 text-[#16191f]">
										{#if loadingBilling}
											<span class="text-xs text-[#879596]">Loading...</span>
										{:else}
											<span class="font-medium"
												>{instance.billing?.monthlyHours.toFixed(1) || '0.0'}h</span
											>
										{/if}
									</td>
									<td class="border-b border-[#e9ecef] px-4 py-4 text-[#16191f]">
										{#if loadingBilling}
											<span class="text-xs text-[#879596]">Loading...</span>
										{:else}
											<span class="font-semibold text-[#ff9900]"
												>${instance.billing?.monthlyCost.toFixed(2) || '0.00'}</span
											>
										{/if}
									</td>
									<td class="border-b border-[#e9ecef] px-4 py-4 text-[#16191f]">
										<div class="flex gap-2">
											{#if instance.state === 'running'}
												<button
													class="min-w-[80px] cursor-pointer rounded border border-[#d13212] bg-[#d13212] px-4 py-1.5 text-xs font-medium text-white transition-all hover:bg-[#a82a0d] disabled:cursor-not-allowed disabled:border-[#e9ecef] disabled:bg-[#e9ecef] disabled:text-[#879596] disabled:hover:bg-[#e9ecef]"
													on:click={() => handleAction(instance.id, 'stop')}
													disabled={actionLoading[instance.id]}
												>
													{actionLoading[instance.id] ? 'Stopping...' : 'Stop'}
												</button>
											{:else if instance.state === 'stopped'}
												<button
													class="min-w-[80px] cursor-pointer rounded border border-[#067f68] bg-[#067f68] px-4 py-1.5 text-xs font-medium text-white transition-all hover:bg-[#055d4f] disabled:cursor-not-allowed disabled:border-[#e9ecef] disabled:bg-[#e9ecef] disabled:text-[#879596] disabled:hover:bg-[#e9ecef]"
													on:click={() => handleAction(instance.id, 'start')}
													disabled={actionLoading[instance.id]}
												>
													{actionLoading[instance.id] ? 'Starting...' : 'Start'}
												</button>
											{:else}
												<button
													class="min-w-[80px] cursor-not-allowed rounded border border-[#e9ecef] bg-[#e9ecef] px-4 py-1.5 text-xs font-medium text-[#879596]"
													disabled
												>
													{instance.state === 'pending' ? 'Starting...' : 'Stopping...'}
												</button>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				{#if instances.length === 0}
					<div class="py-15 text-center text-[#545b64]">
						<p>No EC2 instances found</p>
					</div>
				{/if}
			{/if}
		</div>
	</main>
</div>
