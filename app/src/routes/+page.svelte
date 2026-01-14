<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getAccountsWithBalances,
    createAccount,
    setBalance,
    deleteAccount,
    getChartData,
    getNetWorthStats,
  } from '$lib/api';
  import {
    type AccountWithBalance,
    type AccountType,
    type CreateAccountInput,
    type ChartDataPoint,
    type NetWorthStats,
    ACCOUNT_TYPE_LABELS,
    ACCOUNT_TYPE_COLORS,
  } from '$lib/types';
  import Chart from '$lib/components/Chart.svelte';

  let accounts = $state<AccountWithBalance[]>([]);
  let chartData = $state<ChartDataPoint[]>([]);
  let stats = $state<NetWorthStats | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Chart controls state
  type TimeRange = '1M' | '3M' | '6M' | '1Y' | '5Y' | 'All';
  type ChartType = 'networth' | 'breakdown';
  let selectedTimeRange = $state<TimeRange>('1Y');
  let selectedChartType = $state<ChartType>('networth');

  // Calculate date range based on selection
  function getDateRange(range: TimeRange): { from: string; to: string } {
    const to = new Date();
    const from = new Date();

    switch (range) {
      case '1M':
        from.setMonth(from.getMonth() - 1);
        break;
      case '3M':
        from.setMonth(from.getMonth() - 3);
        break;
      case '6M':
        from.setMonth(from.getMonth() - 6);
        break;
      case '1Y':
        from.setFullYear(from.getFullYear() - 1);
        break;
      case '5Y':
        from.setFullYear(from.getFullYear() - 5);
        break;
      case 'All':
        from.setFullYear(2000); // Far enough back
        break;
    }

    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    };
  }

  async function loadChartData() {
    const { from, to } = getDateRange(selectedTimeRange);
    chartData = await getChartData(from, to);
  }

  // Modal state
  let showAddAccount = $state(false);
  let showAddBalance = $state(false);
  let selectedAccountId = $state<string | null>(null);

  // Form state
  let newAccount = $state<CreateAccountInput>({
    name: '',
    account_type: 'savings',
    institution: '',
    description: '',
    currency: 'GBP',
  });

  let newBalance = $state({
    balance: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Derived values
  const assetAccounts = $derived(accounts.filter((a) => a.category === 'asset'));
  const liabilityAccounts = $derived(accounts.filter((a) => a.category === 'liability'));

  const totalAssets = $derived(
    assetAccounts.reduce((sum, a) => sum + a.current_balance, 0)
  );
  const totalLiabilities = $derived(
    liabilityAccounts.reduce((sum, a) => sum + Math.abs(a.current_balance), 0)
  );
  const netWorth = $derived(totalAssets - totalLiabilities);

  async function loadAccounts() {
    try {
      loading = true;
      accounts = await getAccountsWithBalances();
      await loadChartData();
      stats = await getNetWorthStats();
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load accounts';
    } finally {
      loading = false;
    }
  }

  // Reload chart when time range changes
  $effect(() => {
    // Track the dependency
    const _range = selectedTimeRange;
    if (!loading && accounts.length > 0) {
      loadChartData();
    }
  });

  async function handleAddAccount() {
    try {
      await createAccount(newAccount);
      showAddAccount = false;
      newAccount = {
        name: '',
        account_type: 'savings',
        institution: '',
        description: '',
        currency: 'GBP',
      };
      await loadAccounts();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to create account';
    }
  }

  async function handleAddBalance() {
    if (!selectedAccountId) return;
    try {
      await setBalance({
        account_id: selectedAccountId,
        date: newBalance.date,
        balance: parseFloat(newBalance.balance),
        notes: newBalance.notes || undefined,
      });
      showAddBalance = false;
      newBalance = {
        balance: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      };
      selectedAccountId = null;
      await loadAccounts();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to add balance';
    }
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      await deleteAccount(id);
      await loadAccounts();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to delete account';
    }
  }

  function openBalanceModal(accountId: string) {
    selectedAccountId = accountId;
    const account = accounts.find((a) => a.id === accountId);
    if (account) {
      newBalance.balance = account.current_balance.toString();
    }
    showAddBalance = true;
  }

  function formatCurrency(value: number, currency: string = 'GBP'): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatCompact(value: number): string {
    if (Math.abs(value) >= 1000) {
      return '£' + (value / 1000).toFixed(1) + 'k';
    }
    return formatCurrency(value);
  }

  onMount(() => {
    loadAccounts();
  });
</script>

<div class="grid grid-cols-[280px_1fr] min-h-screen">
  <!-- Sidebar -->
  <aside class="bg-bg-secondary border-r border-line-subtle py-5 flex flex-col h-screen overflow-hidden">
    <div class="flex items-center gap-2.5 px-5 pb-6 font-semibold text-sm tracking-tight">
      <div class="w-[26px] h-[26px] bg-gradient-to-br from-accent-green to-accent-green-light rounded flex items-center justify-center">
        <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>
      <span>Tally</span>
    </div>

    <div class="px-5 pb-6 border-b border-line-subtle mb-4">
      <div class="text-[11px] font-medium text-content-tertiary uppercase tracking-wider mb-1">Net Worth</div>
      <div class="font-mono text-[28px] font-semibold tracking-tight">{formatCurrency(netWorth)}</div>
      {#if stats}
        <div class="flex items-center gap-2 mt-1.5">
          <span class="font-mono text-[13px] font-medium {stats.ytdChange >= 0 ? 'text-accent-green' : 'text-accent-red'}">
            {stats.ytdChange >= 0 ? '+' : ''}{formatCurrency(stats.ytdChange)} ({stats.ytdChange >= 0 ? '+' : ''}{stats.ytdChangePercent}%)
          </span>
          <span class="text-[11px] text-content-tertiary px-1.5 py-0.5 bg-bg-tertiary rounded">YTD</span>
        </div>
      {/if}
    </div>

    <div class="grid grid-cols-2 gap-2 px-5 pb-5 border-b border-line-subtle">
      <div class="p-3 bg-bg-tertiary rounded-lg border border-line-subtle">
        <div class="text-[10px] font-medium text-content-tertiary uppercase tracking-wider mb-1">Assets</div>
        <div class="font-mono text-sm font-semibold text-accent-blue">{formatCurrency(totalAssets)}</div>
      </div>
      <div class="p-3 bg-bg-tertiary rounded-lg border border-line-subtle">
        <div class="text-[10px] font-medium text-content-tertiary uppercase tracking-wider mb-1">Liabilities</div>
        <div class="font-mono text-sm font-semibold text-accent-orange">{formatCurrency(totalLiabilities)}</div>
      </div>
      <div class="p-3 bg-bg-tertiary rounded-lg border border-line-subtle">
        <div class="text-[10px] font-medium text-content-tertiary uppercase tracking-wider mb-1">This Year</div>
        <div class="font-mono text-sm font-semibold {(stats?.ytdChange ?? 0) >= 0 ? 'text-accent-green' : 'text-accent-red'}">
          {(stats?.ytdChange ?? 0) >= 0 ? '+' : ''}{formatCompact(stats?.ytdChange ?? 0)}
        </div>
      </div>
      <div class="p-3 bg-bg-tertiary rounded-lg border border-line-subtle">
        <div class="text-[10px] font-medium text-content-tertiary uppercase tracking-wider mb-1">Monthly Avg</div>
        <div class="font-mono text-sm font-semibold {(stats?.monthlyAvgChange ?? 0) >= 0 ? 'text-accent-green' : 'text-accent-red'}">
          {(stats?.monthlyAvgChange ?? 0) >= 0 ? '+' : ''}{formatCurrency(stats?.monthlyAvgChange ?? 0)}
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto py-4 px-3">
      <div class="flex items-center justify-between px-2 mb-2">
        <span class="text-[11px] font-medium text-content-tertiary uppercase tracking-wider">Assets</span>
        <span class="font-mono text-xs font-medium text-content-secondary">{formatCurrency(totalAssets)}</span>
      </div>

      {#each assetAccounts as account}
        <button
          type="button"
          class="grid grid-cols-[8px_1fr_auto] gap-2.5 items-center p-2.5 px-2 rounded w-full text-left bg-transparent transition-colors duration-150 hover:bg-white/[0.02]"
          onclick={() => openBalanceModal(account.id)}
        >
          <div class="w-2 h-2 rounded-sm {ACCOUNT_TYPE_COLORS[account.account_type]}"></div>
          <div class="min-w-0">
            <div class="text-[13px] font-medium truncate">{account.name}</div>
            <div class="text-[11px] text-content-tertiary truncate">
              {ACCOUNT_TYPE_LABELS[account.account_type]}
              {#if account.institution}
                · {account.institution}
              {/if}
            </div>
          </div>
          <div class="text-right">
            <div class="font-mono text-[13px] font-medium">{formatCurrency(account.current_balance, account.currency)}</div>
          </div>
        </button>
      {/each}

      {#if assetAccounts.length === 0}
        <button
          type="button"
          class="w-full py-4 px-3 text-center rounded-lg border border-dashed border-line hover:border-accent-green/50 hover:bg-accent-green/5 transition-colors group"
          onclick={() => (showAddAccount = true)}
        >
          <div class="text-content-tertiary text-xs group-hover:text-content-secondary">
            <svg class="w-5 h-5 mx-auto mb-1.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 5v14M5 12h14" stroke-linecap="round" />
            </svg>
            Add an asset
          </div>
        </button>
      {/if}

      <div class="h-px bg-line-subtle mx-2 my-3"></div>

      <div class="flex items-center justify-between px-2 mb-2">
        <span class="text-[11px] font-medium text-content-tertiary uppercase tracking-wider">Liabilities</span>
        <span class="font-mono text-xs font-medium text-content-secondary">-{formatCurrency(totalLiabilities)}</span>
      </div>

      {#each liabilityAccounts as account}
        <button
          type="button"
          class="grid grid-cols-[8px_1fr_auto] gap-2.5 items-center p-2.5 px-2 rounded w-full text-left bg-transparent transition-colors duration-150 hover:bg-white/[0.02]"
          onclick={() => openBalanceModal(account.id)}
        >
          <div class="w-2 h-2 rounded-sm {ACCOUNT_TYPE_COLORS[account.account_type]}"></div>
          <div class="min-w-0">
            <div class="text-[13px] font-medium truncate">{account.name}</div>
            <div class="text-[11px] text-content-tertiary truncate">
              {ACCOUNT_TYPE_LABELS[account.account_type]}
              {#if account.institution}
                · {account.institution}
              {/if}
            </div>
          </div>
          <div class="text-right">
            <div class="font-mono text-[13px] font-medium text-accent-orange">-{formatCurrency(Math.abs(account.current_balance), account.currency)}</div>
          </div>
        </button>
      {/each}

      {#if liabilityAccounts.length === 0}
        <div class="py-4 px-3 text-center">
          <div class="text-content-tertiary text-xs">
            <svg class="w-5 h-5 mx-auto mb-1.5 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            No debts — nice!
          </div>
        </div>
      {/if}
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex flex-col overflow-hidden">
    <!-- Top Bar -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-line-subtle bg-bg-primary">
      <div class="flex gap-1 p-1 bg-bg-tertiary rounded-lg">
        {#each ['1M', '3M', '6M', '1Y', '5Y', 'All'] as range}
          <button
            class="px-3 py-1.5 text-xs font-medium rounded transition-all duration-150
              {selectedTimeRange === range
                ? 'bg-bg-primary text-content-primary shadow-sm'
                : 'text-content-secondary hover:text-content-primary'}"
            onclick={() => selectedTimeRange = range as TimeRange}
          >
            {range}
          </button>
        {/each}
      </div>

      <div class="flex items-center gap-3">
        <button class="btn btn-ghost px-2 py-1 text-[11px]" onclick={() => (showAddAccount = true)}>
          + Add Account
        </button>
        <div class="flex gap-1 p-1 bg-bg-tertiary rounded-lg">
          <button
            class="px-3 py-1.5 text-xs font-medium rounded transition-all duration-150
              {selectedChartType === 'networth'
                ? 'bg-bg-primary text-content-primary shadow-sm'
                : 'text-content-secondary hover:text-content-primary'}"
            onclick={() => selectedChartType = 'networth'}
          >
            Net Worth
          </button>
          <button
            class="px-3 py-1.5 text-xs font-medium rounded transition-all duration-150
              {selectedChartType === 'breakdown'
                ? 'bg-bg-primary text-content-primary shadow-sm'
                : 'text-content-secondary hover:text-content-primary'}"
            onclick={() => selectedChartType = 'breakdown'}
          >
            Breakdown
          </button>
        </div>
      </div>
    </div>

    <!-- Chart Area -->
    <div class="flex-1 flex flex-col p-6 overflow-hidden">
      {#if loading}
        <div class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <div class="w-8 h-8 mx-auto mb-3 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin"></div>
            <p class="text-content-secondary text-sm">Loading your data...</p>
          </div>
        </div>
      {:else if error}
        <div class="flex-1 flex items-center justify-center">
          <div class="text-center max-w-[300px]">
            <svg class="w-10 h-10 mx-auto mb-3 text-accent-red opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" stroke-linecap="round" />
            </svg>
            <p class="text-accent-red text-sm mb-3">{error}</p>
            <button class="btn btn-secondary text-xs" onclick={() => loadAccounts()}>
              Try Again
            </button>
          </div>
        </div>
      {:else if accounts.length === 0}
        <div class="flex-1 flex items-center justify-center">
          <div class="text-center max-w-[420px] p-10">
            <div class="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent-green/20 to-accent-green/5 flex items-center justify-center">
              <svg class="w-8 h-8 text-accent-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h2 class="text-2xl font-semibold mb-3">Welcome to Tally</h2>
            <p class="text-content-secondary mb-8 text-sm leading-relaxed">
              Track your net worth by adding your accounts. Add savings, investments, property, pensions, and any debts to see your complete financial picture.
            </p>
            <button class="btn btn-primary" onclick={() => (showAddAccount = true)}>
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Your First Account
            </button>
            <p class="text-content-tertiary text-xs mt-6">
              Your data is stored locally on your device.
            </p>
          </div>
        </div>
      {:else}
        <!-- Chart Legend -->
        <div class="flex gap-6 mb-4">
          <div class="flex items-center gap-2 text-xs text-content-secondary">
            <div class="w-6 h-[3px] rounded bg-accent-green"></div>
            <span>Net Worth</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-content-secondary">
            <div class="w-6 h-[3px] rounded bg-accent-blue"></div>
            <span>Assets</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-content-secondary">
            <div class="w-6 h-[3px] rounded bg-accent-orange"></div>
            <span>Liabilities</span>
          </div>
        </div>

        <!-- Chart -->
        <div class="flex-1 min-h-[300px]">
          <Chart
            data={chartData}
            showAssets={selectedChartType !== 'networth'}
            showLiabilities={selectedChartType !== 'networth'}
          />
        </div>

        <!-- Bottom Stats -->
        <div class="grid grid-cols-4 gap-4 pt-6 border-t border-line-subtle mt-6">
          <div class="p-4 bg-bg-secondary border border-line-subtle rounded-xl">
            <div class="text-[11px] font-medium text-content-tertiary uppercase tracking-wider mb-2">All-Time High</div>
            <div class="font-mono text-xl font-semibold mb-1">{formatCurrency(stats?.allTimeHigh ?? netWorth)}</div>
            <div class="text-xs text-content-tertiary">
              {#if stats?.allTimeHighDate}
                {new Date(stats.allTimeHighDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              {:else}
                Today
              {/if}
            </div>
          </div>
          <div class="p-4 bg-bg-secondary border border-line-subtle rounded-xl">
            <div class="text-[11px] font-medium text-content-tertiary uppercase tracking-wider mb-2">1Y Return</div>
            <div class="font-mono text-xl font-semibold mb-1 {(stats?.oneYearReturnPercent ?? 0) >= 0 ? 'text-accent-green' : 'text-accent-red'}">
              {(stats?.oneYearReturnPercent ?? 0) >= 0 ? '+' : ''}{stats?.oneYearReturnPercent ?? 0}%
            </div>
            <div class="text-xs text-content-tertiary">{(stats?.oneYearReturn ?? 0) >= 0 ? '+' : ''}{formatCurrency(stats?.oneYearReturn ?? 0)}</div>
          </div>
          <div class="p-4 bg-bg-secondary border border-line-subtle rounded-xl">
            <div class="text-[11px] font-medium text-content-tertiary uppercase tracking-wider mb-2">Monthly Avg</div>
            <div class="font-mono text-xl font-semibold mb-1 {(stats?.monthlyAvgChange ?? 0) >= 0 ? 'text-accent-green' : 'text-accent-red'}">
              {(stats?.monthlyAvgChange ?? 0) >= 0 ? '+' : ''}{formatCurrency(stats?.monthlyAvgChange ?? 0)}
            </div>
            <div class="text-xs text-content-tertiary">per month</div>
          </div>
          <div class="p-4 bg-bg-secondary border border-line-subtle rounded-xl">
            <div class="text-[11px] font-medium text-content-tertiary uppercase tracking-wider mb-2">YTD Change</div>
            <div class="font-mono text-xl font-semibold mb-1 {(stats?.ytdChangePercent ?? 0) >= 0 ? 'text-accent-green' : 'text-accent-red'}">
              {(stats?.ytdChangePercent ?? 0) >= 0 ? '+' : ''}{stats?.ytdChangePercent ?? 0}%
            </div>
            <div class="text-xs text-content-tertiary">{(stats?.ytdChange ?? 0) >= 0 ? '+' : ''}{formatCurrency(stats?.ytdChange ?? 0)}</div>
          </div>
        </div>
      {/if}
    </div>
  </main>
</div>

<!-- Add Account Modal -->
{#if showAddAccount}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={() => (showAddAccount = false)}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2 class="modal-title">Add Account</h2>
        <button class="btn btn-ghost" aria-label="Close" onclick={() => (showAddAccount = false)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleAddAccount(); }}>
        <div class="form-group">
          <label for="name">Name</label>
          <input id="name" type="text" bind:value={newAccount.name} placeholder="e.g., Primary Savings" required />
        </div>

        <div class="form-group">
          <label for="type">Type</label>
          <select id="type" bind:value={newAccount.account_type}>
            <optgroup label="Assets">
              <option value="property">Property</option>
              <option value="pension">Pension</option>
              <option value="investment">Investment</option>
              <option value="savings">Savings</option>
            </optgroup>
            <optgroup label="Liabilities">
              <option value="mortgage">Mortgage</option>
              <option value="loan">Loan</option>
              <option value="credit_card">Credit Card</option>
            </optgroup>
          </select>
        </div>

        <div class="form-group">
          <label for="institution">Institution (optional)</label>
          <input id="institution" type="text" bind:value={newAccount.institution} placeholder="e.g., Nationwide" />
        </div>

        <div class="form-group">
          <label for="description">Description (optional)</label>
          <input id="description" type="text" bind:value={newAccount.description} placeholder="e.g., 4.5% AER" />
        </div>

        <div class="form-group">
          <label for="currency">Currency</label>
          <select id="currency" bind:value={newAccount.currency}>
            <option value="GBP">GBP (£)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick={() => (showAddAccount = false)}>Cancel</button>
          <button type="submit" class="btn btn-primary">Add Account</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Add Balance Modal -->
{#if showAddBalance}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={() => (showAddBalance = false)}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2 class="modal-title">Update Balance</h2>
        <button class="btn btn-ghost" aria-label="Close" onclick={() => (showAddBalance = false)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleAddBalance(); }}>
        <div class="form-group">
          <label for="balance">Balance</label>
          <input id="balance" type="number" step="0.01" bind:value={newBalance.balance} placeholder="0.00" required />
        </div>

        <div class="form-group">
          <label for="date">Date</label>
          <input id="date" type="date" bind:value={newBalance.date} required />
        </div>

        <div class="form-group">
          <label for="notes">Notes (optional)</label>
          <input id="notes" type="text" bind:value={newBalance.notes} placeholder="e.g., After monthly deposit" />
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-danger"
            onclick={() => {
              if (selectedAccountId) handleDeleteAccount(selectedAccountId);
              showAddBalance = false;
            }}
          >
            Delete Account
          </button>
          <button type="button" class="btn btn-secondary" onclick={() => (showAddBalance = false)}>Cancel</button>
          <button type="submit" class="btn btn-primary">Save Balance</button>
        </div>
      </form>
    </div>
  </div>
{/if}
