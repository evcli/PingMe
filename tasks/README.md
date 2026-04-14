# PingMe Automation Task

This folder contains automation scripts for specific web pages.

## 1. Task Standard

Every task script must follow these simple rules:

### File Naming
- Put scripts in the `tasks/` folder.
- Filenames must start with `task_` (e.g., `task_confirm_deploy.js`).

### Code Structure
A task script only needs to call `PingMe.registerTask`:

```javascript
PingMe.registerTask('folder:task_name', async (targetElement) => {
    // Logic goes here
    // targetElement is the element found by PingMe
    
    // You can use helpers (e.g., PipelineHelpers)
    const popover = await PipelineHelpers.waitForPopover(targetElement);
    
    // Do something...
    
    // Return result (this will show in the notification)
    return "Task description or result message";
});
```

## 2. How to Add a New Task

1. Create `tasks/task_xxx.js`.
2. Write your logic using the code structure above.
3. **Important**: Add your file path to `manifest.json` under `content_scripts`.
4. **Refresh** the extension in Chrome.
5. Select the task in the PingMe popup.

## 3. How to Test a Task

You can test tasks manually in the Chrome Console:

1. **Switch Context**: Open Console, find the **`top`** dropdown, and select **`PingMe`**.
2. **Pick Element**: Select an element in the "Elements" tab (it becomes `$0`).
3. **Run Task**: Type this in the Console:
   ```javascript
   await PingMe.tasks.id_of_your_task($0);
   ```

## 4. Folder Structure
- `core.js`: The task registry (Don't edit).
- `pipeline/utils.js`: Helpers for Pipeline pages.
- `pipeline/task_*.js`: Tasks for Pipeline pages (Shown as `pipeline:name` in UI).
