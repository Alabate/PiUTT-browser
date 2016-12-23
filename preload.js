Object.defineProperty(window, 'ipc', {
	get: function () {
		return require('electron').ipcRenderer;
	}
});
setInterval(function () {
	console.log('hello');
}, 1000);
