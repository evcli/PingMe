// tasks/core.js - Simple Registry for PingMe tasks

window.PingMe = {
    tasks: {},

    taskConfigs: {},

    /**
     * Fixed protocol: The way a task registers itself
     */
    registerTask(id, handler, config = {}) {
        this.tasks[id] = handler;
        this.taskConfigs[id] = Object.assign({ timeoutMinutes: 30 }, config);
        // Compatibility bridge for content engine
        window.PingMeTasks = this.tasks;
        window.PingMeTaskConfigs = this.taskConfigs;
    }
};
