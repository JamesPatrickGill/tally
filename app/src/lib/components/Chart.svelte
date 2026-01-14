<script lang="ts">
  import type { ChartDataPoint } from '$lib/types';

  interface Props {
    data: ChartDataPoint[];
    showAssets?: boolean;
    showLiabilities?: boolean;
  }

  let { data, showAssets = true, showLiabilities = true }: Props = $props();

  // Chart dimensions
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };

  // Reactive dimensions from container
  let containerWidth = $state(800);
  let containerHeight = $state(400);

  const width = $derived(containerWidth - padding.left - padding.right);
  const height = $derived(containerHeight - padding.top - padding.bottom);

  // Scales
  const xMin = $derived(data.length > 0 ? new Date(data[0].date).getTime() : 0);
  const xMax = $derived(data.length > 0 ? new Date(data[data.length - 1].date).getTime() : 0);

  const yValues = $derived(() => {
    const values: number[] = [];
    for (const d of data) {
      values.push(d.netWorth);
      if (showAssets) values.push(d.assets);
      if (showLiabilities) values.push(-d.liabilities);
    }
    return values;
  });

  const yMin = $derived(Math.min(0, ...yValues()));
  const yMax = $derived(Math.max(...yValues()) * 1.1); // 10% padding on top

  // Scale functions
  function scaleX(date: string): number {
    if (xMax === xMin) return width / 2;
    const t = new Date(date).getTime();
    return ((t - xMin) / (xMax - xMin)) * width;
  }

  function scaleY(value: number): number {
    if (yMax === yMin) return height / 2;
    return height - ((value - yMin) / (yMax - yMin)) * height;
  }

  // Generate path for a line
  function linePath(points: Array<{ date: string; value: number }>): string {
    if (points.length === 0) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.date)} ${scaleY(p.value)}`)
      .join(' ');
  }

  // Generate path for area fill (closed path to baseline)
  function areaPath(points: Array<{ date: string; value: number }>): string {
    if (points.length === 0) return '';
    const line = linePath(points);
    const lastX = scaleX(points[points.length - 1].date);
    const firstX = scaleX(points[0].date);
    const baseline = scaleY(0);
    return `${line} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`;
  }

  // Data series
  const netWorthPoints = $derived(data.map(d => ({ date: d.date, value: d.netWorth })));
  const assetPoints = $derived(data.map(d => ({ date: d.date, value: d.assets })));
  const liabilityPoints = $derived(data.map(d => ({ date: d.date, value: -d.liabilities })));

  // Y-axis ticks
  const yTicks = $derived(() => {
    const ticks: number[] = [];
    const range = yMax - yMin;
    const step = Math.pow(10, Math.floor(Math.log10(range))) || 1;
    const niceStep = range / step > 5 ? step * 2 : step;
    for (let v = Math.ceil(yMin / niceStep) * niceStep; v <= yMax; v += niceStep) {
      ticks.push(v);
    }
    return ticks;
  });

  // X-axis ticks (dates)
  const xTicks = $derived(() => {
    if (data.length === 0) return [];
    const ticks: string[] = [];
    const step = Math.max(1, Math.floor(data.length / 6));
    for (let i = 0; i < data.length; i += step) {
      ticks.push(data[i].date);
    }
    if (ticks[ticks.length - 1] !== data[data.length - 1].date) {
      ticks.push(data[data.length - 1].date);
    }
    return ticks;
  });

  function formatCurrency(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return '£' + (value / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(value) >= 1000) {
      return '£' + (value / 1000).toFixed(0) + 'k';
    }
    return '£' + value.toFixed(0);
  }

  function formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  }

  // Tooltip state
  let tooltipData = $state<ChartDataPoint | null>(null);
  let tooltipX = $state(0);
  let tooltipY = $state(0);

  function handleMouseMove(e: MouseEvent) {
    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left - padding.left;

    if (x < 0 || x > width || data.length === 0) {
      tooltipData = null;
      return;
    }

    // Find closest data point
    const ratio = x / width;
    const index = Math.round(ratio * (data.length - 1));
    const point = data[Math.max(0, Math.min(index, data.length - 1))];

    tooltipData = point;
    tooltipX = scaleX(point.date) + padding.left;
    tooltipY = scaleY(point.netWorth) + padding.top;
  }

  function handleMouseLeave() {
    tooltipData = null;
  }
</script>

<div
  class="relative w-full h-full min-h-[300px]"
  bind:clientWidth={containerWidth}
  bind:clientHeight={containerHeight}
>
  {#if data.length === 0}
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="text-center">
        <svg class="w-12 h-12 mx-auto mb-3 text-content-tertiary opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 3v18h18" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M7 16l4-4 4 4 5-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <p class="text-content-tertiary text-sm">No data for this time range</p>
        <p class="text-content-tertiary/60 text-xs mt-1">Try selecting a different period</p>
      </div>
    </div>
  {:else}
    <svg
      class="w-full h-full"
      viewBox="0 0 {containerWidth} {containerHeight}"
      preserveAspectRatio="xMidYMid meet"
      onmousemove={handleMouseMove}
      onmouseleave={handleMouseLeave}
    >
      <g transform="translate({padding.left}, {padding.top})">
        <!-- Grid lines -->
        {#each yTicks() as tick}
          <line
            x1="0"
            y1={scaleY(tick)}
            x2={width}
            y2={scaleY(tick)}
            class="stroke-line-subtle"
          />
        {/each}

        <!-- Zero line -->
        <line
          x1="0"
          y1={scaleY(0)}
          x2={width}
          y2={scaleY(0)}
          class="stroke-line"
        />

        <!-- Area fills -->
        {#if showAssets}
          <path
            d={areaPath(assetPoints)}
            class="fill-accent-blue/10"
          />
        {/if}

        {#if showLiabilities}
          <path
            d={areaPath(liabilityPoints)}
            class="fill-accent-orange/10"
          />
        {/if}

        <path
          d={areaPath(netWorthPoints)}
          class="fill-accent-green/20"
        />

        <!-- Lines -->
        {#if showAssets}
          <path
            d={linePath(assetPoints)}
            class="stroke-accent-blue stroke-[1.5] fill-none"
          />
        {/if}

        {#if showLiabilities}
          <path
            d={linePath(liabilityPoints)}
            class="stroke-accent-orange stroke-[1.5] fill-none"
          />
        {/if}

        <path
          d={linePath(netWorthPoints)}
          class="stroke-accent-green stroke-2 fill-none"
        />

        <!-- Y-axis labels -->
        {#each yTicks() as tick}
          <text
            x="-8"
            y={scaleY(tick)}
            class="fill-content-tertiary text-[10px]"
            text-anchor="end"
            dominant-baseline="middle"
          >
            {formatCurrency(tick)}
          </text>
        {/each}

        <!-- X-axis labels -->
        {#each xTicks() as date}
          <text
            x={scaleX(date)}
            y={height + 20}
            class="fill-content-tertiary text-[10px]"
            text-anchor="middle"
          >
            {formatDate(date)}
          </text>
        {/each}

        <!-- Hover indicator -->
        {#if tooltipData}
          <line
            x1={scaleX(tooltipData.date)}
            y1="0"
            x2={scaleX(tooltipData.date)}
            y2={height}
            class="stroke-content-tertiary stroke-[1] stroke-dashed"
          />
          <circle
            cx={scaleX(tooltipData.date)}
            cy={scaleY(tooltipData.netWorth)}
            r="5"
            class="fill-accent-green stroke-bg-primary stroke-2"
          />
        {/if}
      </g>
    </svg>

    <!-- Tooltip -->
    {#if tooltipData}
      <div
        class="absolute pointer-events-none bg-bg-elevated border border-line rounded-lg p-3 shadow-lg z-10"
        style="left: {Math.min(tooltipX, containerWidth - 160)}px; top: {Math.max(tooltipY - 80, 10)}px;"
      >
        <div class="text-[11px] text-content-tertiary mb-2">
          {new Date(tooltipData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        <div class="space-y-1">
          <div class="flex items-center justify-between gap-4">
            <span class="text-xs text-content-secondary">Net Worth</span>
            <span class="font-mono text-sm font-medium text-accent-green">{formatCurrency(tooltipData.netWorth)}</span>
          </div>
          {#if showAssets}
            <div class="flex items-center justify-between gap-4">
              <span class="text-xs text-content-secondary">Assets</span>
              <span class="font-mono text-xs text-accent-blue">{formatCurrency(tooltipData.assets)}</span>
            </div>
          {/if}
          {#if showLiabilities}
            <div class="flex items-center justify-between gap-4">
              <span class="text-xs text-content-secondary">Liabilities</span>
              <span class="font-mono text-xs text-accent-orange">-{formatCurrency(tooltipData.liabilities)}</span>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>
