// Commit -> Proceed | Promote -> Abort

PingMe.registerTask('pipeline:deploy', async (triggerElement) => {
  const popover = await PipelineHelpers.waitForPopover(triggerElement);
  if (!popover) return { success: false, message: 'Popover timeout' };
  
  const caption = popover.querySelector('.caption')?.innerText || "";

  if (caption.includes('Canary Deployment')) {
    const select = popover.querySelector('select[name="canaryAction"]');
    if (select) {
      select.value = 'COMMIT';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    popover.querySelector('.proceed-button')?.click();
    return { success: true, message: 'Deploy: Proceed' };
  }

  if (caption.includes('Promote to Nexus')) {
    popover.querySelector('.abort-button')?.click();
    return { success: true, message: 'Promote to Nexus: Abort' };
  }

  return { success: false, message: 'Deploy: No matching action found.' };
});
