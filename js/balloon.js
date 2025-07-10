 let totalPrice = 0;
        let balloonCounter = 0;
        let draggedElement = null;
        let selectedBalloon = null;
        let selectedElement = null;
        let offset = { x: 0, y: 0 };
        let highestZIndex = 10;
        let lowestZIndex = 1;
        let messageCounter = 0;
        let isResizing = false;
        
        const balloonSizes = {
            small: { width: 240, height: 160, price: 20.00 },
            medium: { width: 360, height: 240, price: 20.00 },
            large: { width: 160, height: 200, price: 10.00 }
        };
        
        let selectedColors = {
            small: '#ff6b6b',
            medium: '#ff6b6b',
            large: '#ff6b6b'
        };
        
        let messageStyles = {
            background: 'black',
            font: 'white'
        };
        
        function createBalloonSVG(size, color) {
            const { width, height } = balloonSizes[size];
            
            if (size === 'large') {
                // Single large balloon
                return `
                    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                        <defs>
                            <radialGradient id="grad-${size}-${color.replace('#', '')}" cx="30%" cy="30%">
                                <stop offset="0%" style="stop-color:${lightenColor(color, 0.3)};stop-opacity:1" />
                                <stop offset="100%" style="stop-color:${color};stop-opacity:1" />
                            </radialGradient>
                        </defs>
                        <circle cx="${width/2}" cy="${height*0.45}" r="${width*0.42}" 
                                fill="url(#grad-${size}-${color.replace('#', '')})" 
                                stroke="${darkenColor(color, 0.2)}" stroke-width="2"/>
                        <line x1="${width/2}" y1="${height*0.45 + width*0.42}" x2="${width/2}" y2="${height-5}" 
                              stroke="${darkenColor(color, 0.3)}" stroke-width="2"/>
                        <polygon points="${width/2-3},${height-5} ${width/2+3},${height-5} ${width/2},${height}" 
                                 fill="${darkenColor(color, 0.3)}"/>
                    </svg>
                `;
            } else {
                // Cluster of 6 balloons for small and medium with clusters touching
                const balloonRadius = size === 'small' ? 30 : 44;
                const verticalOverlap = balloonRadius * 0.3; // 30% vertical overlap
                const centerX = width / 2;
                
                const positions = [
                    // Left column - closer to center
                    { x: centerX - balloonRadius * 0.3, y: balloonRadius + 5 },
                    { x: centerX - balloonRadius * 0.3, y: balloonRadius + 25 - verticalOverlap },
                    { x: centerX - balloonRadius * 0.3, y: balloonRadius + 45 - verticalOverlap * 2 },
                    // Right column - closer to center, touching the left column
                    { x: centerX + balloonRadius * 0.3, y: balloonRadius + 5 },
                    { x: centerX + balloonRadius * 0.3, y: balloonRadius + 25 - verticalOverlap },
                    { x: centerX + balloonRadius * 0.3, y: balloonRadius + 45 - verticalOverlap * 2 }
                ];
                
                let svg = `
                    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                        <defs>
                            <radialGradient id="grad-${size}-${color.replace('#', '')}" cx="30%" cy="30%">
                                <stop offset="0%" style="stop-color:${lightenColor(color, 0.3)};stop-opacity:1" />
                                <stop offset="100%" style="stop-color:${color};stop-opacity:1" />
                            </radialGradient>
                        </defs>
                `;
                
                // Draw balloons in reverse order so front ones overlap properly
                positions.reverse().forEach((pos, index) => {
                    svg += `
                        <circle cx="${pos.x}" cy="${pos.y}" r="${balloonRadius}" 
                                fill="url(#grad-${size}-${color.replace('#', '')})" 
                                stroke="${darkenColor(color, 0.2)}" stroke-width="1"/>
                        <line x1="${pos.x}" y1="${pos.y + balloonRadius}" x2="${pos.x}" y2="${pos.y + balloonRadius + 8}" 
                              stroke="${darkenColor(color, 0.3)}" stroke-width="1"/>
                    `;
                });
                
                svg += `</svg>`;
                return svg;
            }
        }
        
        function lightenColor(color, percent) {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent * 100);
            const R = (num >> 16) + amt;
            const G = (num >> 8 & 0x00FF) + amt;
            const B = (num & 0x0000FF) + amt;
            return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
        }
        
        function darkenColor(color, percent) {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent * 100);
            const R = (num >> 16) - amt;
            const G = (num >> 8 & 0x00FF) - amt;
            const B = (num & 0x0000FF) - amt;
            return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
                (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
                (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
        }
        
        function updateBalloonTemplates() {
            Object.keys(balloonSizes).forEach(size => {
                const container = document.getElementById(`${size}-balloons`);
                container.innerHTML = `
                    <div class="balloon-template" draggable="true" data-size="${size}">
                        ${createBalloonSVG(size, selectedColors[size])}
                    </div>
                `;
            });
        }
        
        function setupColorPickers() {
            Object.keys(balloonSizes).forEach(size => {
                const colorPicker = document.getElementById(`${size}-colors`);
                colorPicker.addEventListener('click', (e) => {
                    if (e.target.classList.contains('color-option')) {
                        colorPicker.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
                        e.target.classList.add('active');
                        selectedColors[size] = e.target.dataset.color;
                        updateBalloonTemplates();
                    }
                });
            });
        }
        
        function changeBgColor(color) {
            console.log('Background color clicked:', color);
            
            // Update active state
            document.querySelectorAll('#bg-color-options .style-option').forEach(opt => {
                opt.classList.remove('active');
            });
            document.querySelector(`#bg-color-options [data-bg="${color}"]`).classList.add('active');
            
            // Update style
            messageStyles.background = color;
            updateAllMessages();
        }
        
        function changeFontColor(color) {
            console.log('Font color clicked:', color);
            
            // Update active state
            document.querySelectorAll('#font-color-options .style-option').forEach(opt => {
                opt.classList.remove('active');
            });
            document.querySelector(`#font-color-options [data-font="${color}"]`).classList.add('active');
            
            // Update style
            messageStyles.font = color;
            updateAllMessages();
        }
        
        function updateAllMessages() {
            const templates = document.querySelectorAll('.message-template');
            const canvasMessages = document.querySelectorAll('.text-element');
            const styles = getMessageStyles();
            
            console.log('Updating all messages with styles:', styles);
            
            // Update sidebar templates
            templates.forEach(template => {
                template.style.backgroundColor = styles.backgroundColor;
                template.style.color = styles.color;
            });
            
            // Update canvas messages
            canvasMessages.forEach(message => {
                message.style.backgroundColor = styles.backgroundColor;
                message.style.color = styles.color;
            });
        }
        
        function getMessageStyles() {
            const styles = {
                black: { bg: '#333', color: '#fff' },
                white: { bg: '#fff', color: '#333' },
                gold: { bg: '#ffd700', color: '#333' },
                green: { bg: '#28a745', color: '#fff' },
                red: { bg: '#dc3545', color: '#fff' },
                blue: { bg: '#007bff', color: '#fff' }
            };
            
            const fontColors = {
                black: '#333',
                white: '#fff',
                gold: '#ffd700',
                green: '#28a745',
                red: '#dc3545',
                blue: '#007bff'
            };
            
            return {
                backgroundColor: styles[messageStyles.background].bg,
                color: fontColors[messageStyles.font]
            };
        }
        
        function updateMessageTemplates() {
            // This function is now handled by updateAllMessages()
            updateAllMessages();
        }
        
        function setupBackgroundControls() {
            const bgOptions = document.querySelectorAll('.bg-option');
            bgOptions.forEach(option => {
                option.addEventListener('click', () => {
                    bgOptions.forEach(opt => opt.classList.remove('active'));
                    option.classList.add('active');
                    document.getElementById('canvas').style.background = option.dataset.bg;
                });
            });
            
            // Set initial white background
            document.getElementById('canvas').style.background = '#ffffff';
        }
        
        function setupDragAndDrop() {
            const canvas = document.getElementById('canvas');
            
            // Handle drag start from templates
            document.addEventListener('dragstart', (e) => {
                if (e.target.closest('.balloon-template')) {
                    const template = e.target.closest('.balloon-template');
                    const size = template.dataset.size;
                    e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: 'balloon',
                        size: size,
                        color: selectedColors[size]
                    }));
                } else if (e.target.closest('.message-template')) {
                    const template = e.target.closest('.message-template');
                    const text = template.textContent.replace('×', '').trim();
                    e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: 'message',
                        text: text
                    }));
                }
            });
            
            // Handle drop on canvas
            canvas.addEventListener('dragover', (e) => {
                e.preventDefault();
                canvas.classList.add('drag-over');
            });
            
            canvas.addEventListener('dragleave', (e) => {
                if (!canvas.contains(e.relatedTarget)) {
                    canvas.classList.remove('drag-over');
                }
            });
            
            canvas.addEventListener('drop', (e) => {
                e.preventDefault();
                canvas.classList.remove('drag-over');
                
                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    if (data.type === 'balloon') {
                        const adjustedX = x - balloonSizes[data.size].width / 2;
                        const adjustedY = y - balloonSizes[data.size].height / 2;
                        createBalloonOnCanvas(data.size, data.color, adjustedX, adjustedY);
                    } else if (data.type === 'message') {
                        createMessageOnCanvas(data.text, x - 100, y - 20); // Center the message
                    }
                } catch (error) {
                    console.error('Error dropping item:', error);
                }
            });
            
            // Handle dragging existing elements
            canvas.addEventListener('mousedown', (e) => {
                // Don't start dragging if already resizing or clicking on resize handle
                if (isResizing || e.target.classList.contains('resize-handle')) {
                    return;
                }
                
                if (e.target.closest('.balloon') || e.target.closest('.text-element')) {
                    draggedElement = e.target.closest('.balloon') || e.target.closest('.text-element');
                    draggedElement.classList.add('dragging');
                    const rect = draggedElement.getBoundingClientRect();
                    offset.x = e.clientX - rect.left;
                    offset.y = e.clientY - rect.top;
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
            
            document.addEventListener('mousemove', (e) => {
                // Don't drag if resizing
                if (isResizing || !draggedElement) return;
                
                const canvasRect = canvas.getBoundingClientRect();
                const x = e.clientX - canvasRect.left - offset.x;
                const y = e.clientY - canvasRect.top - offset.y;
                
                const maxX = canvas.offsetWidth - draggedElement.offsetWidth;
                const maxY = canvas.offsetHeight - draggedElement.offsetHeight;
                
                draggedElement.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
                draggedElement.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            });
            
            document.addEventListener('mouseup', () => {
                if (draggedElement && !isResizing) {
                    draggedElement.classList.remove('dragging');
                    draggedElement = null;
                }
            });
            
            // Click on canvas to deselect
            canvas.addEventListener('click', (e) => {
                if (e.target === canvas) {
                    hideControls();
                }
            });
            
            document.addEventListener('mousemove', (e) => {
                // This is now handled in the drag section above
            });
            
            document.addEventListener('mouseup', () => {
                // This is now handled in the drag section above  
            });
        }
        
        function createBalloonOnCanvas(size, color, x, y) {
            const canvas = document.getElementById('canvas');
            const balloon = document.createElement('div');
            balloon.className = 'balloon';
            balloon.dataset.size = size;
            balloon.dataset.price = balloonSizes[size].price;
            balloon.innerHTML = createBalloonSVG(size, color);
            
            // Position balloon
            const maxX = canvas.offsetWidth - balloonSizes[size].width;
            const maxY = canvas.offsetHeight - balloonSizes[size].height;
            balloon.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            balloon.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            balloon.style.zIndex = ++highestZIndex;
            
            // Add click to select
            balloon.addEventListener('click', (e) => {
                e.stopPropagation();
                selectBalloon(balloon);
            });
            
            // Add double-click to remove
            balloon.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const price = parseFloat(balloon.dataset.price);
                totalPrice -= price;
                updatePriceDisplay();
                balloon.remove();
                hideControls();
            });
            
            canvas.appendChild(balloon);
            
            // Update price
            totalPrice += balloonSizes[size].price;
            updatePriceDisplay();
        }
        
        function selectBalloon(balloon) {
            // Remove selection from other elements
            document.querySelectorAll('.balloon, .text-element').forEach(el => el.classList.remove('selected'));
            
            // Select the clicked balloon
            balloon.classList.add('selected');
            selectedBalloon = balloon;
            selectedElement = balloon;
            showControls();
        }
        
        function selectTextElement(textElement) {
            // Remove selection from other elements
            document.querySelectorAll('.balloon, .text-element').forEach(el => el.classList.remove('selected'));
            
            // Select the clicked text element
            textElement.classList.add('selected');
            selectedBalloon = null;
            selectedElement = textElement;
            showControls();
        }
        
        function showControls() {
            const controls = document.getElementById('balloon-controls');
            controls.classList.add('show');
            updateControlButtons();
        }
        
        function hideControls() {
            const controls = document.getElementById('balloon-controls');
            controls.classList.remove('show');
            selectedBalloon = null;
            selectedElement = null;
            document.querySelectorAll('.balloon, .text-element').forEach(el => el.classList.remove('selected'));
        }
        
        function updateControlButtons() {
            if (!selectedElement) return;
            
            const currentZ = parseInt(selectedElement.style.zIndex);
            const sendBackBtn = document.getElementById('send-back-btn');
            const bringForwardBtn = document.getElementById('bring-forward-btn');
            
            // Disable buttons if at limits
            sendBackBtn.disabled = currentZ <= lowestZIndex;
            bringForwardBtn.disabled = currentZ >= highestZIndex;
        }
        
        function bringBalloonForward() {
            if (!selectedElement) return;
            
            const currentZ = parseInt(selectedElement.style.zIndex);
            if (currentZ < highestZIndex) {
                selectedElement.style.zIndex = ++highestZIndex;
                updateControlButtons();
            }
        }
        
        function sendBalloonBack() {
            if (!selectedElement) return;
            
            const currentZ = parseInt(selectedElement.style.zIndex);
            if (currentZ > lowestZIndex) {
                selectedElement.style.zIndex = --lowestZIndex;
                updateControlButtons();
            }
        }
        
        function deleteBalloon() {
            if (!selectedElement) return;
            
            if (selectedElement.classList.contains('balloon')) {
                const price = parseFloat(selectedElement.dataset.price);
                totalPrice -= price;
                updatePriceDisplay();
            }
            
            selectedElement.remove();
            hideControls();
        }
        
        function updatePriceDisplay() {
            document.getElementById('total-price').textContent = totalPrice.toFixed(2);
        }
        
        function addMessage() {
            const input = document.getElementById('message-input');
            const text = input.value.trim();
            
            if (text.length === 0) {
                alert('Please enter a message!');
                return;
            }
            
            if (text.length > 50) {
                alert('Message is too long! Please keep it under 50 characters.');
                return;
            }
            
            const container = document.getElementById('message-templates');
            const messageTemplate = document.createElement('div');
            messageTemplate.className = 'message-template';
            messageTemplate.draggable = true;
            
            const styles = getMessageStyles();
            messageTemplate.style.backgroundColor = styles.backgroundColor;
            messageTemplate.style.color = styles.color;
            
            messageTemplate.innerHTML = `
                ${text}
                <button class="delete-msg" onclick="deleteMessageTemplate(this)" title="Delete message">×</button>
            `;
            
            container.appendChild(messageTemplate);
            input.value = '';
        }
        
        function deleteMessageTemplate(button) {
            button.parentElement.remove();
        }
        
        function createMessageOnCanvas(text, x, y) {
            const canvas = document.getElementById('canvas');
            const textElement = document.createElement('div');
            textElement.className = 'text-element';
            textElement.textContent = text;
            
            // Apply current styling
            const styles = getMessageStyles();
            textElement.style.backgroundColor = styles.backgroundColor;
            textElement.style.color = styles.color;
            
            // Set initial size and font
            textElement.style.width = '200px';
            textElement.style.height = '40px';
            updateFontSize(textElement);
            
            // Position text element
            const maxX = canvas.offsetWidth - 200;
            const maxY = canvas.offsetHeight - 40;
            textElement.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            textElement.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            textElement.style.zIndex = ++highestZIndex;
            
            // Add resize handle
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'resize-handle';
            textElement.appendChild(resizeHandle);
            
            // Add click to select
            textElement.addEventListener('click', (e) => {
                e.stopPropagation();
                selectTextElement(textElement);
            });
            
            // Add double-click to remove
            textElement.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                textElement.remove();
                hideControls();
            });
            
            // Setup resize functionality
            setupResizeHandlers(textElement, resizeHandle);
            
            canvas.appendChild(textElement);
        }
        
        function updateFontSize(textElement) {
            const width = parseInt(textElement.style.width) || textElement.offsetWidth;
            const height = parseInt(textElement.style.height) || textElement.offsetHeight;
            const text = textElement.textContent;
            
            // Calculate font size based on dimensions and text length
            const baseSize = Math.min(width / text.length * 1.5, height * 0.6);
            const fontSize = Math.max(8, Math.min(baseSize, 48)); // Min 8px, max 48px
            
            textElement.style.fontSize = fontSize + 'px';
            textElement.style.lineHeight = (height - 16) + 'px'; // Account for padding
        }
        
        function setupResizeHandlers(textElement, resizeHandle) {
            let startX, startY, startWidth, startHeight;
            
            resizeHandle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = parseInt(document.defaultView.getComputedStyle(textElement).width, 10);
                startHeight = parseInt(document.defaultView.getComputedStyle(textElement).height, 10);
                
                textElement.style.cursor = 'se-resize';
                document.body.style.userSelect = 'none';
                
                console.log('Starting resize'); // Debug log
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;
                
                e.preventDefault();
                
                const newWidth = Math.max(80, Math.min(400, startWidth + e.clientX - startX));
                const newHeight = Math.max(30, Math.min(200, startHeight + e.clientY - startY));
                
                textElement.style.width = newWidth + 'px';
                textElement.style.height = newHeight + 'px';
                
                updateFontSize(textElement);
            });
            
            document.addEventListener('mouseup', () => {
                if (isResizing) {
                    isResizing = false;
                    textElement.style.cursor = 'move';
                    document.body.style.userSelect = '';
                    console.log('Finished resize'); // Debug log
                }
            });
        }
        
        // Initialize the application
        document.addEventListener('DOMContentLoaded', () => {
            updateBalloonTemplates();
            setupColorPickers();
            setupBackgroundControls();
            setupDragAndDrop();
            setupMessageInput();
            updatePriceDisplay();
        });