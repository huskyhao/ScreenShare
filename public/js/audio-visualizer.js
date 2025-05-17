/**
 * Audio Visualizer
 * 
 * This module provides audio visualization functionality for the ScreenShare application.
 * It can visualize audio levels in different styles (bar, wave, circle).
 */

class AudioVisualizer {
  /**
   * Create a new audio visualizer
   * @param {HTMLElement} container - The container element for the visualizer
   * @param {Object} options - Visualization options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = Object.assign({
      type: 'bar', // 'bar', 'wave', 'circle'
      color: '#4a6bff',
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      width: container.clientWidth,
      height: container.clientHeight,
      barWidth: 4,
      barSpacing: 1,
      barCount: 32,
      responsive: true,
      smoothing: 0.5, // 0-1, higher = smoother
      minLevel: 0.001, // Minimum level to show (0-1)
      maxLevel: 1.0, // Maximum level to show (0-1)
    }, options);
    
    this.canvas = null;
    this.ctx = null;
    this.audioLevel = 0;
    this.displayLevel = 0;
    this.animationFrame = null;
    this.resizeObserver = null;
    
    this._init();
  }
  
  /**
   * Initialize the visualizer
   * @private
   */
  _init() {
    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    
    // Add canvas to container
    this.container.appendChild(this.canvas);
    
    // Get drawing context
    this.ctx = this.canvas.getContext('2d');
    
    // Start animation loop
    this._animate();
    
    // Set up resize observer if responsive
    if (this.options.responsive) {
      this._setupResizeObserver();
    }
  }
  
  /**
   * Set up resize observer to handle container size changes
   * @private
   */
  _setupResizeObserver() {
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.target === this.container) {
            this._handleResize();
          }
        }
      });
      
      this.resizeObserver.observe(this.container);
    } else {
      // Fallback for browsers without ResizeObserver
      window.addEventListener('resize', () => this._handleResize());
    }
  }
  
  /**
   * Handle container resize
   * @private
   */
  _handleResize() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.options.width = rect.width;
    this.options.height = rect.height;
  }
  
  /**
   * Animation loop
   * @private
   */
  _animate() {
    // Smooth the audio level
    this.displayLevel += (this.audioLevel - this.displayLevel) * this.options.smoothing;
    
    // Apply min/max levels
    const level = Math.max(this.options.minLevel, Math.min(this.options.maxLevel, this.displayLevel));
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw visualization based on type
    switch (this.options.type) {
      case 'bar':
        this._drawBars(level);
        break;
      case 'wave':
        this._drawWave(level);
        break;
      case 'circle':
        this._drawCircle(level);
        break;
      default:
        this._drawBars(level);
    }
    
    // Continue animation loop
    this.animationFrame = requestAnimationFrame(() => this._animate());
  }
  
  /**
   * Draw bar visualization
   * @param {number} level - Audio level (0-1)
   * @private
   */
  _drawBars(level) {
    const { ctx, canvas, options } = this;
    const { barWidth, barSpacing, barCount } = options;
    
    // Calculate total width of all bars and spacing
    const totalWidth = (barWidth + barSpacing) * barCount - barSpacing;
    
    // Center bars horizontally
    const startX = (canvas.width - totalWidth) / 2;
    
    // Set fill style
    ctx.fillStyle = options.color;
    
    // Draw background
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(startX, 0, totalWidth, canvas.height);
    
    // Draw bars
    ctx.fillStyle = options.color;
    for (let i = 0; i < barCount; i++) {
      // Calculate bar height based on position and level
      // Center bars have higher amplitude
      const centerOffset = Math.abs(i - barCount / 2) / (barCount / 2);
      const barHeight = canvas.height * level * (1 - centerOffset * 0.5);
      
      // Calculate bar position
      const x = startX + i * (barWidth + barSpacing);
      const y = canvas.height - barHeight;
      
      // Draw bar
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }
  
  /**
   * Draw wave visualization
   * @param {number} level - Audio level (0-1)
   * @private
   */
  _drawWave(level) {
    const { ctx, canvas, options } = this;
    
    // Set line style
    ctx.strokeStyle = options.color;
    ctx.lineWidth = 2;
    
    // Draw background
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Start path
    ctx.beginPath();
    
    // Draw wave
    const amplitude = canvas.height * 0.25 * level;
    const frequency = 6 * Math.PI / canvas.width;
    
    // Move to start position
    ctx.moveTo(0, canvas.height / 2);
    
    // Draw wave points
    for (let x = 0; x <= canvas.width; x++) {
      const y = canvas.height / 2 + Math.sin(x * frequency) * amplitude;
      ctx.lineTo(x, y);
    }
    
    // Stroke path
    ctx.stroke();
  }
  
  /**
   * Draw circle visualization
   * @param {number} level - Audio level (0-1)
   * @private
   */
  _drawCircle(level) {
    const { ctx, canvas, options } = this;
    
    // Calculate center and radius
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(canvas.width, canvas.height) / 2 - 5;
    const minRadius = maxRadius * 0.2;
    
    // Calculate current radius based on level
    const radius = minRadius + (maxRadius - minRadius) * level;
    
    // Draw background circle
    ctx.fillStyle = options.backgroundColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw level circle
    ctx.fillStyle = options.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  /**
   * Update the audio level
   * @param {number} level - Audio level (0-1)
   */
  updateLevel(level) {
    this.audioLevel = level;
  }
  
  /**
   * Change the visualization type
   * @param {string} type - Visualization type ('bar', 'wave', 'circle')
   */
  setType(type) {
    if (['bar', 'wave', 'circle'].includes(type)) {
      this.options.type = type;
    }
  }
  
  /**
   * Change the visualization color
   * @param {string} color - CSS color string
   */
  setColor(color) {
    this.options.color = color;
  }
  
  /**
   * Destroy the visualizer and clean up resources
   */
  destroy() {
    // Stop animation loop
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    // Remove resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    // Remove canvas from container
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    this.canvas = null;
    this.ctx = null;
  }
}

// Export for use in browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioVisualizer;
} else {
  window.AudioVisualizer = AudioVisualizer;
}
