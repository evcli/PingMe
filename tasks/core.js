// tasks/core.js - Simple Registry for PingMe tasks

window.PingMe = {
    tasks: {},

    taskConfigs: {},

    /**
     * Registers a task. The ID can be provided explicitly or inferred from the file path.
     * Usage:
     *   PingMe.registerTask('folder:name', async (...) => { ... });
     *   PingMe.registerTask(async (...) => { ... }); // Inferred from filename
     */
    registerTask(idOrHandler, handlerOrConfig, config = {}) {
        let id, handler, finalConfig;

        if (typeof idOrHandler === 'string') {
            id = idOrHandler;
            handler = handlerOrConfig;
            finalConfig = config;
        } else {
            handler = idOrHandler;
            finalConfig = handlerOrConfig || {};
            
            // Auto-infer ID from caller script file name
            try {
                const stack = new Error().stack;
                // Match the first URL in the stack that isn't core.js
                // Example line: at chrome-extension://abc/tasks/pipeline/task_test.js:3:8
                const matches = stack.match(/chrome-extension:\/\/[^\/]+\/(tasks\/.*?\.js)/g);
                const callerFile = matches ? matches[matches.length - 1] : null;

                if (callerFile) {
                    const path = callerFile.split('tasks/')[1];
                    const parts = path.split('/');
                    const fileName = parts.pop().replace('.js', '').replace(/^task_/, '');
                    const folderPath = parts.join(':'); // Use : for nested folders if any
                    id = folderPath ? `${folderPath}:${fileName}` : fileName;
                } else {
                    console.error('[PingMe] Could not infer task ID from stack trace.');
                    return;
                }
            } catch (e) {
                console.error('[PingMe] Failed to infer task ID:', e);
                return;
            }
        }

        this.tasks[id] = handler;
        this.taskConfigs[id] = Object.assign({ timeoutMinutes: 30 }, finalConfig);
        
        // Compatibility bridge for content engine
        window.PingMeTasks = this.tasks;
        window.PingMeTaskConfigs = this.taskConfigs;
        
        console.log(`[PingMe] Registered task: ${id}`);
    }
};
