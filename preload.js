Object.defineProperty(window, 'ipc', {
	get: function () {
		return require('electron').ipcRenderer;
	}
});
