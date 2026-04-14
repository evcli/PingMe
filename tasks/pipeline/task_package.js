// Commit -> Proceed | Promote -> Proceed

PingMe.registerTask('pipeline:package', async (triggerElement) => {
  const popover = await PipelineHelpers.waitForPopover(triggerElement);
  const caption = popover.querySelector('.caption')?.innerText || "";

  if (caption.includes('Canary Deployment')) {
    const select = popover.querySelector('select[name="canaryAction"]');
    if (select) {
      select.value = 'COMMIT';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    popover.querySelector('.proceed-button')?.click();
    return 'Deploy: Proceed';
  }

  if (caption.includes('Promote to Nexus')) {
    popover.querySelector('.proceed-button')?.click();
    return 'Promote to Nexus: Proceed';
  }

  return 'Package: No matching action found.';
});
