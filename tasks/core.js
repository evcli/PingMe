// tasks/core.js - Simple Registry for PingMe tasks

window.PingMe = {
    tasks: {},

    /**
     * Fixed protocol: The way a task registers itself
     */
    registerTask(id, handler) {
        this.tasks[id] = handler;
        // Compatibility bridge for content engine
        window.PingMeTasks = this.tasks;
    }
};
