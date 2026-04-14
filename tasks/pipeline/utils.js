// tasks/pipeline_utils.js - Specialized helpers for Pipeline automation

window.PipelineHelpers = {
    async waitForPopover(triggerElement) {
        const stageWrapper = triggerElement.closest('.stage-wrapper');
        if (!stageWrapper) throw new Error('Stage wrapper not found');

        // Trigger hover
        stageWrapper.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

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
