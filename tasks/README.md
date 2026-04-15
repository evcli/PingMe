# PingMe Automation Tasks

This folder contains automation scripts ("Tasks") for specific web pages.

## 1. Task Standard

Every task script must follow these requirements to be discovered by the UI:

### File Naming
- **Location**: Put scripts in a subfolder within `tasks/` (e.g., `tasks/pipeline/`).
- **Prefix**: Filenames **must** start with `task_` (e.g., `task_confirm_deploy.js`).

### Code Structure
Call `PingMe.registerTask` with the ID format `folder:filename_without_prefix`.

```javascript
// Example: tasks/pipeline/task_deploy.js -> ID: 'pipeline:deploy'

PingMe.registerTask('pipeline:deploy', async (targetElement) => {
    // 1. Your automation logic here
    // targetElement is the DOM node that triggered the rule
    
    // 2. Return a string result (shows in the notification)
    return "Deployment confirmed!";
});
```

---

## 2. How to Add a New Task

1.  **Create the script**: Create `tasks/your_folder/task_your_name.js`.
2.  **Logic**: Implement using the structure above.
3.  **Register**: Open `manifest.json` and add your file path to `content_scripts`.
4.  **Reload**: Refresh the extension in `chrome://extensions`.
5.  **Select**: The task will now appear in the "Task" dropdown in the PingMe popup.

---

## 3. How to Test a Task

You can manually trigger any registered task in the browser console for debugging:

1.  **Switch Context**: Open Chrome DevTools Console, find the **`top`** dropdown (above the console input), and select **`PingMe`**.
2.  **Pick Element**: Select an element in the "Elements" tab (it becomes `$0`).
3.  **Run**: Execute the task using its ID:
    ```javascript
    await PingMe.tasks['pipeline:deploy']($0);
    ```

---

## 4. Folder Structure Reference
- `core.js`: Task registry and bridge (Don't edit).
- `pipeline/utils.js`: Shared helpers (e.g., hover simulations).
- `pipeline/task_*.js`: Specific tasks for pipeline pages.
