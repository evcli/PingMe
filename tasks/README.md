# PingMe Automation Tasks

This folder contains automation scripts ("Tasks") that run dynamically on top of your web monitors. 

## 1. How a Task Works

Think of a Task as a parasitic program:
1. You bind it to a UI trigger in the PingMe extension.
2. It executes multiple times as long as it's active.
3. The Task decides when it is truly **done**.
4. Upon reporting `finished: true`, PingMe automatically detaches the task and cleans up the background alarms.

## 2. Task Standard & Code Structure

Every task script must follow these conventions:

- **Naming**: Put scripts inside a folder, starting with `task_` (e.g., `tasks/pipeline/task_deploy.js`).
- **Registration**: Use `PingMe.registerTask(id, handler, config)`. 
- **Timeouts**: Always define a `timeoutMinutes` in the config list. If the task gets stuck, the system will force-kill it after this time.

```javascript
// Example: tasks/pipeline/task_deploy.js 
// Registration ID format: 'folderName:fileNameWithoutPrefix'

PingMe.registerTask('pipeline:deploy', async (triggerElement) => {
    // 1. Perform DOM interactions (clicks, polling, extracting)
    const button = document.querySelector('.submit-btn');
    if (!button) {
        // If critical failure, report finished to unbind immediately
        return { success: false, message: 'Button missing', finished: true }; 
    }
    
    // 2. Do the action
    button.click();

    // 3. Return your state. 
    // If it's a multi-step process and you aren't done yet, omit `finished`.
    // If this is the final step in the pipeline, pass `finished: true` to trigger cleanup!
    return { success: true, message: "Deploy step complete", finished: true };

}, { timeoutMinutes: 15 }); // Safety limit: System unbinds it after 15 mins if it hangs
```

## 3. How to Add a New Task

1.  **Create File**: e.g., `tasks/jira/task_auto_reply.js`.
2.  **Write Code**: Implement following the structure above.
3.  **Inject**: Open the root `manifest.json` and add `"tasks/jira/task_auto_reply.js"` inside the `content_scripts -> js` array.
4.  **Reload**: Refresh the extension in Chrome. The task instantly appears in the PingMe popup!

## 4. How to Test a Task Manually

You can directly invoke any registered task inside the browser for rapid debugging:

1. Open Chrome DevTools (F12) Console on the target website.
2. Find the **Execution Context** dropdown (it says `top` by default) and switch it to **`PingMe`**.
3. Go to the "Elements" panel, right-click the element you want to simulate as the trigger, and select `Store as global variable` or simply leave it selected (it becomes `$0`).
4. Execute your task in the PingMe console:
    ```javascript
    await PingMe.tasks['pipeline:deploy']($0);
    ```
