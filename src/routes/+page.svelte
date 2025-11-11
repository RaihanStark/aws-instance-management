<script lang="ts">
	import { goto } from '$app/navigation';

	let password = '';
	let error = '';
	let loading = false;

	async function handleLogin() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ password })
			});

			const data = await response.json();

			if (response.ok && data.success) {
				goto('/dashboard');
			} else {
				error = data.error || 'Invalid password';
			}
		} catch (err) {
			error = 'An error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<style>
		body {
			margin: 0;
			padding: 0;
			font-family: 'Amazon Ember', 'Helvetica Neue', Arial, sans-serif;
		}
	</style>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-5 bg-[#232f3e]">
	<div class="bg-white rounded-lg shadow-xl p-10 w-full max-w-md">
		<div class="text-center mb-8">
			<div class="flex justify-center mb-4">
				<svg width="40" height="40" viewBox="0 0 40 40" fill="none">
					<rect width="40" height="40" rx="4" fill="#FF9900"/>
					<path d="M20 10L30 15V25L20 30L10 25V15L20 10Z" fill="white"/>
				</svg>
			</div>
			<h1 class="text-2xl font-semibold text-[#232f3e] mb-2">AWS Instance Manager</h1>
			<p class="text-[#545b64] text-sm m-0">Sign in to manage your EC2 instances</p>
		</div>

		<form on:submit|preventDefault={handleLogin}>
			<div class="mb-5">
				<label for="password" class="block text-[#16191f] text-sm font-medium mb-2">Password</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					placeholder="Enter password"
					disabled={loading}
					class="w-full px-3 py-2.5 border border-[#aab7b8] rounded text-sm transition-colors focus:outline-none focus:border-[#ff9900] focus:ring-2 focus:ring-[#ff9900]/10 disabled:bg-[#f1f3f3] disabled:cursor-not-allowed"
				/>
			</div>

			{#if error}
				<div class="bg-[#ffeaea] border border-[#d13212] text-[#d13212] px-3 py-2.5 rounded text-sm mb-4">
					{error}
				</div>
			{/if}

			<button
				type="submit"
				disabled={loading || !password}
				class="w-full px-4 py-2.5 bg-[#ff9900] text-white rounded text-sm font-semibold transition-colors hover:bg-[#ec7211] disabled:bg-[#aab7b8] disabled:cursor-not-allowed disabled:hover:bg-[#aab7b8]"
			>
				{loading ? 'Signing in...' : 'Sign in'}
			</button>
		</form>
	</div>
</div>
