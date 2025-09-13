// Lash Extension Training App
class LashTrainingApp {
    constructor() {
        this.canvas = document.getElementById('eye-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.lashTray = document.getElementById('lash-tray');
        this.score = 0;
        this.placedCount = 0;
        this.totalLashes = 36;
        
        // Touch and interaction state
        this.isDragging = false;
        this.currentLash = null;
        this.dragOffset = { x: 0, y: 0 };
        this.touchStartTime = 0;
        this.isPinching = false;
        this.initialTouchDistance = 0;
        this.canvasRect = null;
        this.canvasScale = { x: 1, y: 1 };
        this.activeTouchId = null;  // Track the specific touch used for dragging
        
        // Eye model data
        this.eyeModel = {
            centerX: 200,
            centerY: 150,
            width: 160,
            height: 80,
            placementPoints: []
        };
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.generateLashes();
        this.generatePlacementPoints();
        this.drawEyeModel();
        this.setupEventListeners();
        this.updateUI();
        this.updateCanvasScale();
    }
    
    setupCanvas() {
        // Set consistent internal canvas size
        this.canvas.width = 400;
        this.canvas.height = 300;
        
        // Cache canvas rect for coordinate calculations
        this.canvasRect = this.canvas.getBoundingClientRect();
    }
    
    generateLashes() {
        const lashTypes = ['short', 'medium', 'long'];
        
        for (let i = 0; i < this.totalLashes; i++) {
            const lash = document.createElement('div');
            lash.className = `lash ${lashTypes[i % 3]}`;
            lash.dataset.id = i;
            lash.dataset.type = lashTypes[i % 3];
            
            this.lashTray.appendChild(lash);
        }
    }
    
    generatePlacementPoints() {
        // Generate three rows of upper lash placement points along the lash line margin
        const points = [];
        const centerX = this.eyeModel.centerX;
        const centerY = this.eyeModel.centerY;
        const width = this.eyeModel.width;
        const height = this.eyeModel.height;
        
        // For upside-down eye, upper lash line spans the bottom arc
        // Angle range from approximately 0.2π to 0.8π (36° to 144° from horizontal)
        const startAngle = Math.PI * 0.2;  // Start angle for lash line
        const endAngle = Math.PI * 0.8;    // End angle for lash line
        const angleRange = endAngle - startAngle;
        
        // Three rows positioned along the lash line with offsets
        const rows = [
            { name: 'inner', offset: -8, count: 12 },    // Closest to eye (inward offset)
            { name: 'middle', offset: 0, count: 12 },    // On the lash line
            { name: 'outer', offset: 8, count: 12 }      // Furthest from eye (outward offset)
        ];
        
        rows.forEach(row => {
            for (let i = 0; i < row.count; i++) {
                // Calculate angle position along the upper lash line
                const angleProgress = i / (row.count - 1);
                const angle = startAngle + angleProgress * angleRange;
                
                // Calculate base position on the ellipse edge
                const baseX = centerX + Math.cos(angle) * (width / 2);
                const baseY = centerY + Math.sin(angle) * (height / 2);
                
                // Calculate normal vector (perpendicular to ellipse at this point)
                const normalX = Math.cos(angle) * (height / width);  // Adjust for ellipse aspect ratio
                const normalY = Math.sin(angle);
                const normalLength = Math.sqrt(normalX * normalX + normalY * normalY);
                const unitNormalX = normalX / normalLength;
                const unitNormalY = normalY / normalLength;
                
                // Apply offset along the normal (positive = outward from eye)
                const x = baseX + unitNormalX * row.offset;
                const y = baseY + unitNormalY * row.offset;
                
                points.push({ x, y, occupied: false, type: 'upper', row: row.name });
            }
        });
        
        this.eyeModel.placementPoints = points;
    }
    
    drawEyeModel() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const centerX = this.eyeModel.centerX;
        const centerY = this.eyeModel.centerY;
        const width = this.eyeModel.width;
        const height = this.eyeModel.height;
        
        // Save the current context state
        this.ctx.save();
        
        // Flip the canvas vertically to make the eye upside down
        this.ctx.translate(0, this.canvas.height);
        this.ctx.scale(1, -1);
        
        // Draw eye shape (upside down) - use normal coordinates, canvas transformation handles the flip
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw iris (upside down)
        this.ctx.fillStyle = '#4a90e2';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw pupil (upside down)
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw placement points - use normal coordinates, canvas transformation handles the flip
        this.eyeModel.placementPoints.forEach(point => {
            this.ctx.fillStyle = point.occupied ? '#28a745' : '#dc3545';
            this.ctx.globalAlpha = 0.6;
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
        
        // Draw any placed lashes in the flipped coordinate system
        this.drawPlacedLashes();
        
        // Restore the context to normal orientation
        this.ctx.restore();
    }
    
    drawPlacedLashes() {
        this.eyeModel.placementPoints.forEach(point => {
            if (point.occupied && point.lash) {
                const angle = this.calculateLashAngle(point);
                const length = this.getLashLength(point.lash.type);
                
                this.ctx.strokeStyle = '#000';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                
                // Use normal coordinates - canvas transformation handles the flip
                const endX = point.x + Math.cos(angle) * length;
                const endY = point.y + Math.sin(angle) * length;
                
                this.ctx.moveTo(point.x, point.y);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
            }
        });
    }
    
    calculateLashAngle(point) {
        const centerX = this.eyeModel.centerX;
        const centerY = this.eyeModel.centerY;
        const width = this.eyeModel.width;
        const height = this.eyeModel.height;
        
        // Calculate the angle from center to point
        const angleToPoint = Math.atan2(point.y - centerY, point.x - centerX);
        
        // Calculate normal vector (perpendicular to ellipse at this point)
        // This gives us the proper outward direction for the lash
        const normalX = Math.cos(angleToPoint) * (height / width);  // Adjust for ellipse aspect ratio
        const normalY = Math.sin(angleToPoint);
        
        // For upside-down eye, upper lashes should point outward and slightly upward
        // Since the visual is flipped, "upward" in our coordinate system is actually downward visually
        const lashAngle = Math.atan2(normalY, normalX);
        
        // Adjust for upside-down orientation - lashes should curve upward (which is downward in flipped coords)
        return lashAngle - Math.PI / 6;  // Subtract 30° to make lashes curve upward naturally
    }
    
    getLashLength(type) {
        switch (type) {
            case 'short': return 20;
            case 'medium': return 30;
            case 'long': return 40;
            default: return 30;
        }
    }
    
    setupEventListeners() {
        // Mouse events for desktop
        this.lashTray.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Touch events for mobile
        this.lashTray.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // Canvas drop events
        this.canvas.addEventListener('mouseup', this.handleCanvasDrop.bind(this));
        this.canvas.addEventListener('touchend', this.handleCanvasDrop.bind(this));
        
        // Modal close event
        document.getElementById('close-modal').addEventListener('click', () => {
            document.getElementById('feedback-modal').classList.add('hidden');
        });
        
        // Prevent default drag behavior
        document.addEventListener('dragstart', e => e.preventDefault());
        
        // Add resize event listener
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    // Mouse Events (Desktop)
    handleMouseDown(e) {
        if (e.target.classList.contains('lash') && !e.target.classList.contains('placed')) {
            this.startDragging(e.target, e.clientX, e.clientY);
            e.preventDefault();
        }
    }
    
    handleMouseMove(e) {
        if (this.isDragging && this.currentLash) {
            this.updateLashPosition(e.clientX, e.clientY);
            e.preventDefault();
        }
    }
    
    handleMouseUp(e) {
        if (this.isDragging) {
            this.stopDragging();
        }
    }
    
    // Touch Events (Mobile)
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            
            if (target && target.classList.contains('lash') && !target.classList.contains('placed')) {
                this.touchStartTime = Date.now();
                this.currentLash = target;
                this.activeTouchId = touch.identifier;  // Store the active touch ID
                e.preventDefault();
            }
        } else if (e.touches.length === 2) {
            // Direct two-finger pinch detection
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            // Calculate initial distance between touches
            this.initialTouchDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) + 
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            
            // Find target under first touch if we don't have one already
            if (!this.currentLash) {
                const target = document.elementFromPoint(touch1.clientX, touch1.clientY);
                if (target && target.classList.contains('lash') && !target.classList.contains('placed')) {
                    this.currentLash = target;
                }
            }
            
            // Start dragging if we have a valid lash
            if (this.currentLash) {
                this.isPinching = true;
                this.activeTouchId = touch1.identifier;  // Use first touch as active touch
                this.startDragging(this.currentLash, touch1.clientX, touch1.clientY);
                e.preventDefault();
            }
        }
    }
    
    handleTouchMove(e) {
        // Find the active touch by its identifier
        let activeTouch = null;
        if (this.activeTouchId !== null) {
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.activeTouchId) {
                    activeTouch = e.touches[i];
                    break;
                }
            }
        }
        
        if (this.isDragging && activeTouch) {
            // Only update position using the active touch
            this.updateLashPosition(activeTouch.clientX, activeTouch.clientY);
            e.preventDefault();
        } else if (e.touches.length === 1 && this.currentLash && !this.isDragging && this.activeTouchId === e.touches[0].identifier) {
            // Long press detection - only for the tracked touch
            const currentTime = Date.now();
            if (currentTime - this.touchStartTime > 500) {
                const touch = e.touches[0];
                this.startDragging(this.currentLash, touch.clientX, touch.clientY);
            }
        }
    }
    
    handleTouchEnd(e) {
        // Check if the active dragging touch was lifted
        let activeTouchEnded = false;
        if (this.activeTouchId !== null) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.activeTouchId) {
                    activeTouchEnded = true;
                    break;
                }
            }
        }
        
        // Only stop dragging if the active touch ended
        if (this.isDragging && activeTouchEnded) {
            this.stopDragging();
        }
        
        // Clean up pinch state if no more touches
        if (e.touches.length === 0) {
            this.isPinching = false;
            this.currentLash = null;
            this.touchStartTime = 0;
            this.activeTouchId = null;
        }
    }
    
    startDragging(lash, clientX, clientY) {
        this.isDragging = true;
        this.currentLash = lash;
        
        const rect = lash.getBoundingClientRect();
        this.dragOffset.x = clientX - rect.left;
        this.dragOffset.y = clientY - rect.top;
        
        lash.classList.add('grabbed');
        lash.style.position = 'fixed';
        lash.style.zIndex = '1000';
        lash.style.pointerEvents = 'none';
        
        this.updateLashPosition(clientX, clientY);
    }
    
    updateLashPosition(clientX, clientY) {
        if (this.currentLash) {
            this.currentLash.style.left = (clientX - this.dragOffset.x) + 'px';
            this.currentLash.style.top = (clientY - this.dragOffset.y) + 'px';
        }
    }
    
    stopDragging() {
        if (this.currentLash) {
            this.currentLash.classList.remove('grabbed');
            this.currentLash.style.position = '';
            this.currentLash.style.zIndex = '';
            this.currentLash.style.left = '';
            this.currentLash.style.top = '';
            this.currentLash.style.pointerEvents = '';
        }
        
        this.isDragging = false;
        this.currentLash = null;
        this.activeTouchId = null;  // Clear the active touch ID
    }
    
    handleCanvasDrop(e) {
        if (!this.isDragging || !this.currentLash) return;
        
        this.updateCanvasScale();
        let clientX, clientY;
        
        if (e.type === 'touchend' && e.changedTouches) {
            // Find the correct touch using the active touch identifier
            let activeTouch = null;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.activeTouchId) {
                    activeTouch = e.changedTouches[i];
                    break;
                }
            }
            
            if (activeTouch) {
                clientX = activeTouch.clientX;
                clientY = activeTouch.clientY;
            } else {
                // Fallback to first touch if active touch not found
                clientX = e.changedTouches[0].clientX;
                clientY = e.changedTouches[0].clientY;
            }
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        // Convert screen coordinates to canvas coordinates with proper scaling
        const canvasX = (clientX - this.canvasRect.left) * this.canvasScale.x;
        const canvasY = (clientY - this.canvasRect.top) * this.canvasScale.y;
        
        // Convert Y coordinate to match the flipped coordinate system used for placement points
        const modelY = this.canvas.height - canvasY;
        
        // Find nearest placement point using the converted coordinates
        const nearestPoint = this.findNearestPlacementPoint(canvasX, modelY);
        
        if (nearestPoint && !nearestPoint.occupied) {
            // Successful placement
            nearestPoint.occupied = true;
            nearestPoint.lash = {
                type: this.currentLash.dataset.type,
                element: this.currentLash
            };
            
            this.currentLash.classList.add('placed');
            this.placedCount++;
            this.score += this.calculateScore(nearestPoint);
            
            this.drawEyeModel();
            this.updateUI();
            this.showFeedback('Perfect Placement!', 'Great positioning on the natural lash.');
            
            if (this.placedCount === this.totalLashes) {
                setTimeout(() => {
                    this.showFeedback('Training Complete!', `Final Score: ${this.score} points`);
                }, 1000);
            }
        }
        
        this.stopDragging();
    }
    
    findNearestPlacementPoint(x, y) {
        let nearest = null;
        let minDistance = Infinity;
        
        this.eyeModel.placementPoints.forEach(point => {
            if (!point.occupied) {
                const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
                if (distance < 25 && distance < minDistance) {
                    minDistance = distance;
                    nearest = point;
                }
            }
        });
        
        return nearest;
    }
    
    calculateScore(point) {
        // Score based on lash type and placement accuracy
        const baseScore = 10;
        const typeBonus = {
            'short': 5,
            'medium': 10,
            'long': 15
        };
        
        return baseScore + (typeBonus[point.lash.type] || 0);
    }
    
    showFeedback(title, message) {
        document.getElementById('feedback-title').textContent = title;
        document.getElementById('feedback-message').textContent = message;
        document.getElementById('feedback-modal').classList.remove('hidden');
        
        setTimeout(() => {
            document.getElementById('feedback-modal').classList.add('hidden');
        }, 2000);
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('placed-count').textContent = this.placedCount;
    }
    
    updateCanvasScale() {
        // Update canvas rect and calculate scaling factors
        this.canvasRect = this.canvas.getBoundingClientRect();
        this.canvasScale.x = this.canvas.width / this.canvasRect.width;
        this.canvasScale.y = this.canvas.height / this.canvasRect.height;
    }
    
    handleResize() {
        // Update canvas scaling on window resize
        this.updateCanvasScale();
        this.drawEyeModel();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LashTrainingApp();
});