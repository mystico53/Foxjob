<script>
  // A minimal dual-series radial progress component
  // Self-contained with no external dependencies
  
  // Default values built in
  export let value1 = 50;  // First segment value (0-100)
  export let value2 = 10;  // Second segment value (0-100)
  export let color1 = "#22c55e";  // Green
  export let color2 = "#3b82f6";  // Blue
  export let bgColor = "#e5e7eb";  // Light gray
  export let thickness = 6;  // Thickness of the rings
  
  // SVG parameters
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const center = 50;
  
  // Calculate stroke-dasharray and stroke-dashoffset for each segment
  $: dash1 = (Math.min(100, Math.max(0, value1)) / 100) * circumference;
  $: dash2 = (Math.min(100, Math.max(0, value2)) / 100) * circumference;
  $: offset2 = -dash1; // Second segment starts where first ends
</script>

<div class="w-full h-full">
  <svg viewBox="0 0 100 100" class="w-full h-full">
    <!-- Background Track -->
    <circle 
      class="fill-none"
      cx={center}
      cy={center}
      r={radius}
      stroke={bgColor}
      stroke-width={thickness}
    />
    
    <!-- First Segment -->
    <circle 
      class="fill-none transition-all duration-300"
      cx={center}
      cy={center}
      r={radius}
      stroke={color1}
      stroke-width={thickness}
      stroke-dasharray="{dash1} {circumference}"
      stroke-dashoffset="0"
      stroke-linecap="round"
      transform="rotate(-90, {center}, {center})"
    />
    
    <!-- Second Segment -->
    <circle 
      class="fill-none transition-all duration-300"
      cx={center}
      cy={center}
      r={radius}
      stroke={color2}
      stroke-width={thickness}
      stroke-dasharray="{dash2} {circumference}"
      stroke-dashoffset="{offset2}"
      stroke-linecap="round"
      transform="rotate(-90, {center}, {center})"
    />
    
    <!-- Center Text -->
    <text 
      x={center} 
      y={center} 
      text-anchor="middle" 
      dominant-baseline="middle"
      font-size="16"
      font-weight="bold"
      fill="#374151"
    >
      {Math.round(value1 + value2)}%
    </text>
  </svg>
</div>