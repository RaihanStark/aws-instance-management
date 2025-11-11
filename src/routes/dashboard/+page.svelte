<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	interface EC2Instance {
		id: string;
		name: string;
		type: string;
		state: 'running' | 'stopped' | 'pending' | 'stopping';
		publicIp: string;
		launchTime: string;
	}

	let instances: EC2Instance[] = [];
	let loading = true;
	let actionLoading: { [key: string]: boolean } = {};

	onMount(() => {
		// Check authentication
		if (!sessionStorage.getItem('authenticated')) {
			goto('/');
			return;
		}

		// Mock data - replace with actual API call
		setTimeout(() => {
			instances = [
				{
					id: 'i-1234567890abcdef0',
					name: 'Production Server',
					type: 't2.micro',
					state: 'running',
					publicIp: '54.123.45.67',
					launchTime: '2025-01-10 14:30:00'
				},
				{
					id: 'i-0987654321fedcba0',
					name: 'Development Server',
					type: 't2.small',
					state: 'stopped',
					publicIp: '-',
					launchTime: '2025-01-08 09:15:00'
				},
				{
					id: 'i-abcdef1234567890a',
					name: 'Staging Server',
					type: 't3.medium',
					state: 'running',
					publicIp: '52.98.76.54',
					launchTime: '2025-01-11 08:00:00'
				}
			];
			loading = false;
		}, 1000);
	});

	function handleLogout() {
		sessionStorage.removeItem('authenticated');
		goto('/');
	}

	async function handleAction(instanceId: string, action: 'start' | 'stop') {
		actionLoading[instanceId] = true;

		// Mock API call - replace with actual AWS API call
		await new Promise((resolve) => setTimeout(resolve, 1500));

		const instance = instances.find((i) => i.id === instanceId);
		if (instance) {
			if (action === 'start') {
				instance.state = 'pending';
				setTimeout(() => {
					instance.state = 'running';
					instance.publicIp = `54.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
					instances = [...instances];
				}, 2000);
			} else {
				instance.state = 'stopping';
				setTimeout(() => {
					instance.state = 'stopped';
					instance.publicIp = '-';
					instances = [...instances];
				}, 2000);
			}
			instances = [...instances];
		}

		actionLoading[instanceId] = false;
	}

	function getStateBgColor(state: string): string {
		const colors = {
			running: 'bg-[#067f68]',
			stopped: 'bg-[#d13212]',
			pending: 'bg-[#ff9900]',
			stopping: 'bg-[#ff9900]'
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
		<div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
			<div class="flex items-center gap-3">
				<div class="block">
					<svg width="32" height="32" viewBox="0 0 40 40" fill="none">
						<rect width="40" height="40" rx="4" fill="#FF9900" />
						<path d="M20 10L30 15V25L20 30L10 25V15L20 10Z" fill="white" />
					</svg>
				</div>
				<h1 class="text-lg font-medium m-0 text-white">AWS Instance Manager</h1>
			</div>
			<button
				class="bg-transparent border border-[#aab7b8] text-white px-4 py-1.5 rounded text-sm cursor-pointer transition-all hover:bg-white/10 hover:border-white"
				on:click={handleLogout}
			>
				Sign out
			</button>
		</div>
	</header>

	<main class="p-6">
		<div class="max-w-7xl mx-auto bg-white rounded-lg shadow overflow-hidden">
			<div class="p-6 border-b border-[#e9ecef]">
				<h2 class="text-2xl font-medium text-[#16191f] m-0 mb-1">EC2 Instances</h2>
				<p class="text-[#545b64] text-sm m-0">Manage your Amazon EC2 instances</p>
			</div>

			{#if loading}
				<div class="py-15 text-center text-[#545b64]">
					<div class="border-4 border-[#e9ecef] border-t-[#ff9900] rounded-full w-10 h-10 animate-spin mx-auto mb-4"></div>
					<p>Loading instances...</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full border-collapse text-sm">
						<thead class="bg-[#fafafa] border-b-2 border-[#e9ecef]">
							<tr>
								<th class="text-left px-4 py-3 font-semibold text-[#16191f] text-xs whitespace-nowrap">Name</th>
								<th class="text-left px-4 py-3 font-semibold text-[#16191f] text-xs whitespace-nowrap">Instance ID</th>
								<th class="text-left px-4 py-3 font-semibold text-[#16191f] text-xs whitespace-nowrap">Instance Type</th>
								<th class="text-left px-4 py-3 font-semibold text-[#16191f] text-xs whitespace-nowrap">Status</th>
								<th class="text-left px-4 py-3 font-semibold text-[#16191f] text-xs whitespace-nowrap">Public IP</th>
								<th class="text-left px-4 py-3 font-semibold text-[#16191f] text-xs whitespace-nowrap">Launch Time</th>
								<th class="text-left px-4 py-3 font-semibold text-[#16191f] text-xs whitespace-nowrap">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each instances as instance}
								<tr class="hover:bg-[#fafafa] transition-colors">
									<td class="px-4 py-4 border-b border-[#e9ecef] text-[#16191f]">
										<span class="font-medium">{instance.name}</span>
									</td>
									<td class="px-4 py-4 border-b border-[#e9ecef] text-[#16191f]">
										<span class="font-mono text-[#545b64] text-xs">{instance.id}</span>
									</td>
									<td class="px-4 py-4 border-b border-[#e9ecef] text-[#16191f]">{instance.type}</td>
									<td class="px-4 py-4 border-b border-[#e9ecef] text-[#16191f]">
										<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white {getStateBgColor(instance.state)}">
											<span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
											{instance.state.charAt(0).toUpperCase() + instance.state.slice(1)}
										</span>
									</td>
									<td class="px-4 py-4 border-b border-[#e9ecef] text-[#16191f]">{instance.publicIp}</td>
									<td class="px-4 py-4 border-b border-[#e9ecef] text-[#16191f]">{instance.launchTime}</td>
									<td class="px-4 py-4 border-b border-[#e9ecef] text-[#16191f]">
										<div class="flex gap-2">
											{#if instance.state === 'running'}
												<button
													class="px-4 py-1.5 rounded text-xs font-medium cursor-pointer transition-all border min-w-[80px] bg-[#d13212] text-white border-[#d13212] hover:bg-[#a82a0d] disabled:bg-[#e9ecef] disabled:border-[#e9ecef] disabled:text-[#879596] disabled:cursor-not-allowed disabled:hover:bg-[#e9ecef]"
													on:click={() => handleAction(instance.id, 'stop')}
													disabled={actionLoading[instance.id]}
												>
													{actionLoading[instance.id] ? 'Stopping...' : 'Stop'}
												</button>
											{:else if instance.state === 'stopped'}
												<button
													class="px-4 py-1.5 rounded text-xs font-medium cursor-pointer transition-all border min-w-[80px] bg-[#067f68] text-white border-[#067f68] hover:bg-[#055d4f] disabled:bg-[#e9ecef] disabled:border-[#e9ecef] disabled:text-[#879596] disabled:cursor-not-allowed disabled:hover:bg-[#e9ecef]"
													on:click={() => handleAction(instance.id, 'start')}
													disabled={actionLoading[instance.id]}
												>
													{actionLoading[instance.id] ? 'Starting...' : 'Start'}
												</button>
											{:else}
												<button
													class="px-4 py-1.5 rounded text-xs font-medium border min-w-[80px] bg-[#e9ecef] border-[#e9ecef] text-[#879596] cursor-not-allowed"
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
