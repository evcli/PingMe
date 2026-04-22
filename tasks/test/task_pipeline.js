// A test task that tracks textarea content and only finishes when "end" is typed.

PingMe.registerTask(async (triggerElement) => {
  // Use the specific ID provided by the user for testing
  const target = document.getElementById('chat-textarea');

  if (!target) {
    return {
      success: false,
      message: 'Test target #chat-textarea not found',
      finished: true
    };
  }

  const val = target.value.trim();

  if (val.toLowerCase() === 'end') {
    return {
      success: true,
      message: `Final state reached: ${val}`,
      finished: true
    };
  } else {
    // Return current state but keep the task mounted (finished: false)
    return {
      success: true,
      message: `Current content: "${val}". Type "end" to finish.`,
      finished: false
    };
  }
}, { timeoutMinutes: 10, isHidden: true });
