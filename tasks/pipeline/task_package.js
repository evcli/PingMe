// Commit -> Proceed | Promote -> Proceed

PingMe.registerTask('pipeline:package', async (triggerElement) => {
  const popover = await PipelineHelpers.waitForPopover(triggerElement);
  if (!popover) return { success: false, message: 'Popover timeout', finished: true };

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
    popover.querySelector('.proceed-button')?.click();
    return { success: true, message: 'Promote to Nexus: Proceed', finished: true };
  }

  return { success: false, message: 'Package: No matching action found.', finished: true };
}, { timeoutMinutes: 90 });
