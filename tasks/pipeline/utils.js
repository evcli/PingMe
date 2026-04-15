// tasks/pipeline_utils.js - Specialized helpers for Pipeline automation

window.PipelineHelpers = {
    async waitForPopover(triggerElement) {

        // Trigger hover
        const rect = triggerElement.getBoundingClientRect();
        const clientX = rect.left + rect.width / 2;
        const clientY = rect.top + rect.height / 2;
        
        ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'mousemove'].forEach(eventType => {
            const isPointer = eventType.startsWith('pointer');
            const EventClass = isPointer ? PointerEvent : MouseEvent;
            
            const eventInit = {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX,
                clientY,
                relatedTarget: document.body,
                ...(isPointer ? { pointerId: 1, pointerType: 'mouse' } : {})
            };
            
            triggerElement.dispatchEvent(new EventClass(eventType, eventInit));
        });

        // Wait for popover
        let popover = null;
        for (let i = 0; i < 20; i++) {
            popover = document.querySelector('.run-input-required.cbwf-popover');
            if (popover && popover.offsetParent !== null) break;
            await new Promise(r => setTimeout(r, 200));
        }

        if (!popover) throw new Error('Popover timeout');
        return popover;
    }
};
