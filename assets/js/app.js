class LashTrainingApp {
    constructor() {
        this.canvas = document.getElementById('eye-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.lashTray = document.getElementById('lash-tray');
        this.score = 0;
        this.placedCount = 0;
        this.totalLashes = 36;
        this.isDragging = false;
        this.currentLash = null;
        this.dragOffset = { x: 0, y: 0 };
        this.touchStartTime = 0;
        this.isPinching = false;
        this.initialTouchDistance = 0;
        this.canvasRect = null;
        this.canvasScale = { x: 1, y: 1 };
        this.activeTouchId = null;
        this.longPressTimer = null;
        this.lastTouchPos = null;
        this.touchStartX = null;
        this.touchStartY = null;
        this.moveThreshold = 10; 
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
        this.canvas.width = 400;
        this.canvas.height = 300;
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
        const points = [];
        const centerX = this.eyeModel.centerX;
        const centerY = this.eyeModel.centerY;
        const width = this.eyeModel.width;
        const height = this.eyeModel.height;
        const startAngle = Math.PI * 0.2;
        const endAngle = Math.PI * 0.8;
        const angleRange = endAngle - startAngle;
        const rows = [
            { name: 'inner', offset: -8, count: 12 },
            { name: 'middle', offset: 0, count: 12 },
            { name: 'outer', offset: 8, count: 12 }
        ];
        
        rows.forEach(row => {
            for (let i = 0; i < row.count; i++) {
                const angleProgress = i / (row.count - 1);
                const angle = startAngle + angleProgress * angleRange;
                const baseX = centerX + Math.cos(angle) * (width / 2);
                const baseY = centerY + Math.sin(angle) * (height / 2);
                const normalX = Math.cos(angle) * (height / width);
                const normalY = Math.sin(angle);
                const normalLength = Math.sqrt(normalX * normalX + normalY * normalY);
                const unitNormalX = normalX / normalLength;
                const unitNormalY = normalY / normalLength;
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
        this.ctx.save();
        this.ctx.translate(0, this.canvas.height);
        this.ctx.scale(1, -1);
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.fillStyle = '#4a90e2';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
        this.ctx.fill();
        this.eyeModel.placementPoints.forEach(point => {
            this.ctx.fillStyle = point.occupied ? '#28a745' : '#dc3545';
            this.ctx.globalAlpha = 0.6;
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
        this.drawPlacedLashes();
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
        const angleToPoint = Math.atan2(point.y - centerY, point.x - centerX);
        const normalX = Math.cos(angleToPoint) * (height / width);
        const normalY = Math.sin(angleToPoint);
        const lashAngle = Math.atan2(normalY, normalX);
        return lashAngle - Math.PI / 6;
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
        this.lashTray.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.lashTray.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        this.canvas.addEventListener('mouseup', this.handleCanvasDrop.bind(this));
        this.canvas.addEventListener('touchend', this.handleCanvasDrop.bind(this));
        document.getElementById('close-modal').addEventListener('click', () => {
            document.getElementById('feedback-modal').classList.add('hidden');
        });
        document.addEventListener('dragstart', e => e.preventDefault());
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
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
    
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target && target.classList.contains('lash') && !target.classList.contains('placed')) {
                this.touchStartTime = Date.now();
                this.currentLash = target;
                this.activeTouchId = touch.identifier;
                this.touchStartX = touch.clientX;
                this.touchStartY = touch.clientY;
                this.lastTouchPos = { x: touch.clientX, y: touch.clientY };
                clearTimeout(this.longPressTimer);
                this.longPressTimer = setTimeout(() => {
                    this.startDragging(this.currentLash, this.lastTouchPos.x, this.lastTouchPos.y);
                }, 500);
                e.preventDefault();
            }
        } else if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            this.initialTouchDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        }
    }
    
    handleTouchMove(e) {
        let activeTouch = null;
        if (this.activeTouchId !== null) {
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.activeTouchId) {
                    activeTouch = e.touches[i];
                    break;
                }
            }
        } else if (e.touches.length === 1) {
            activeTouch = e.touches[0];
        }
        if (activeTouch) {
            this.lastTouchPos = { x: activeTouch.clientX, y: activeTouch.clientY };
            if (!this.isDragging && this.touchStartX !== null && this.touchStartY !== null) {
                const moved = Math.hypot(this.lastTouchPos.x - this.touchStartX, this.lastTouchPos.y - this.touchStartY);
                if (moved > this.moveThreshold) {
                    clearTimeout(this.longPressTimer);
                }
            }
            if (this.isDragging) {
                this.updateLashPosition(activeTouch.clientX, activeTouch.clientY);
                e.preventDefault();
            }
        }
    }
    
    handleTouchEnd(e) {
        clearTimeout(this.longPressTimer);
        let activeTouchEnded = false;
        if (this.activeTouchId !== null) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.activeTouchId) {
                    activeTouchEnded = true;
                    break;
                }
            }
        } else {
            if (this.isDragging) activeTouchEnded = true;
        }
        if (this.isDragging && activeTouchEnded) {
            this.handleCanvasDrop(e);
        }
        if (e.touches.length === 0) {
            this.isPinching = false;
            this.currentLash = null;
            this.touchStartTime = 0;
            this.activeTouchId = null;
            this.touchStartX = null;
            this.touchStartY = null;
            this.lastTouchPos = null;
        }
    }
    
    startDragging(lash, clientX, clientY) {
        if (!lash) return;
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
        this.activeTouchId = null;
    }
    
    handleCanvasDrop(e) {
        if (!this.isDragging || !this.currentLash) return;
        this.updateCanvasScale();
        let clientX, clientY;
        if (e.type === 'touchend' && e.changedTouches) {
            let activeTouch = null;
            if (this.activeTouchId !== null) {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === this.activeTouchId) {
                        activeTouch = e.changedTouches[i];
                        break;
                    }
                }
            }
            if (activeTouch) {
                clientX = activeTouch.clientX;
                clientY = activeTouch.clientY;
            } else if (this.lastTouchPos) {
                clientX = this.lastTouchPos.x;
                clientY = this.lastTouchPos.y;
            } else {
                clientX = e.changedTouches[0].clientX;
                clientY = e.changedTouches[0].clientY;
            }
        } else if (e.type === 'mouseup') {
            clientX = e.clientX;
            clientY = e.clientY;
        } else {
            if (this.lastTouchPos) {
                clientX = this.lastTouchPos.x;
                clientY = this.lastTouchPos.y;
            } else {
                this.stopDragging();
                return;
            }
        }
        
        const canvasX = (clientX - this.canvasRect.left) * this.canvasScale.x;
        const canvasY = (clientY - this.canvasRect.top) * this.canvasScale.y;
        const modelY = this.canvas.height - canvasY;
        const nearestPoint = this.findNearestPlacementPoint(canvasX, modelY);
        if (nearestPoint && !nearestPoint.occupied) {
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
            // this.showFeedback('Perfect Placement!', 'Great positioning on the natural lash.');

            if (this.placedCount === 3) {
                setTimeout(() => {
                    this.showFeedback('Perfect Placement!', 'Great positioning on the natural lash.');
                }, 1000);
            }
            if (this.placedCount === 11) {
                setTimeout(() => {
                    this.showFeedback('Perfect Placement!', 'Great positioning on the natural lash.');
                }, 1000);
            }
            if (this.placedCount === 31) {
                setTimeout(() => {
                    this.showFeedback('Perfect Placement!', 'Great positioning on the natural lash.');
                }, 1000);
            }
            if (this.placedCount === this.totalLashes) {
                setTimeout(() => {
                    this.showFeedback('Perfect Placement!', 'Great positioning on the natural lash.');
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
        this.canvasRect = this.canvas.getBoundingClientRect();
        this.canvasScale.x = this.canvas.width / this.canvasRect.width;
        this.canvasScale.y = this.canvas.height / this.canvasRect.height;
    }
    
    handleResize() {
        this.updateCanvasScale();
        this.drawEyeModel();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LashTrainingApp();
});