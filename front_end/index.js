let dir = '';
let autoAddMD5 = true;

$(function init() {
	uploader.init();
});

let uploader = new plupload.Uploader({
	runtimes: 'html5,flash,silverlight,html4',
	browse_button: 'selectfiles',
	//multi_selection: false,
	url: 'will be replaced',
	flash_swf_url: 'lib/plupload-2.1.2/js/Moxie.swf',
	silverlight_xap_url: 'lib/plupload-2.1.2/js/Moxie.xap',
	// filters: {
	// 	mime_types: [ //只允许上传图片和zip文件
	// 		{title: 'Image files', extensions: 'jpg,gif,png,bmp'},
	// 		{title: 'Zip files', extensions: 'zip,rar'}
	// 	],
	// 	max_file_size: '10mb', //最大只能上传10mb的文件
	// 	prevent_duplicates: true //不允许选取重复文件
	// },
	init: {
		PostInit: postInit,
		FilesAdded: filesAdded,
		BeforeUpload: beforeUpload,
		UploadProgress: uploadProgress,
		FileUploaded: fileUploaded,
		Error: errorHandel
	}
});

function beforeUpload(up, file) {
	let option = up.getOption('multipart_params');
	option.key = dir + file.name;
	up.setOption('multipart_params', option);
}

function postInit() {
	document.getElementById('ossfile').innerHTML = '';
	document.getElementById('postfiles').onclick = function () {
		set_upload_param(uploader).then(function () {
			uploader.start();
		});
		return false;
	};
}

function filesAdded(up, files) {
	files.forEach(function (file) {
		if (!file.md5 && file.name.indexOf('.md5') < 0) {
			getFileMD5(file.getNative(), function (md5) {
				document.getElementById('ossfile').innerHTML += '<div id="' + file.id + '">' + file.name + ' (' + plupload.formatSize(file.size) + ')(MD5:' + md5 + ')<b></b>'
					+ '<div class="progress"><div class="progress-bar" style="width: 0"></div></div>'
					+ '</div>';
				let option = up.getOption('multipart_params') || {};
				option['Content-MD5'] = btoa(hexToBinaryString(md5));
				up.setOption('multipart_params', option);
				if (autoAddMD5) {
					up.addFile(new File([md5], file.name + '.md5'));
					file.md5 = true;
				}
			});
		}else{
			document.getElementById('ossfile').innerHTML += '<div id="' + file.id + '">' + file.name + '<b></b>'
				+ '<div class="progress"><div class="progress-bar" style="width: 0"></div></div>'
				+ '</div>';
		}
	});
}

function uploadProgress(up, file) {
	let d = document.getElementById(file.id);
	d.getElementsByTagName('b')[0].innerHTML = '<span> ' + file.percent + '%</span>';
	let prog = d.getElementsByTagName('div')[0];
	let progBar = prog.getElementsByTagName('div')[0];
	progBar.style.width = 2 * file.percent + 'px';
	progBar.setAttribute('aria-valuenow', file.percent);
}

function fileUploaded(up, file, info) {
	if (info.status == 200) {
		document.getElementById(file.id).getElementsByTagName('b')[0].innerHTML = 'upload to oss success, object name:' + file.name + ' 回调服务器返回的内容是:' + info.response;
	}
	else if (info.status == 203) {
		document.getElementById(file.id).getElementsByTagName('b')[0].innerHTML = '上传到OSS成功，但是oss访问用户设置的上传回调服务器失败，失败原因是:' + info.response;
	}
	else {
		document.getElementById(file.id).getElementsByTagName('b')[0].innerHTML = info.response;
	}
}

function errorHandel(up, err) {
	let msg = '';
	if (err.code == -600) {
		msg = '\n选择的文件太大了,可以根据应用情况，在upload.js 设置一下上传的最大大小';
	} else if (err.code == -601) {
		msg = '\n选择的文件后缀不对,可以根据应用情况，在upload.js进行设置可允许的上传文件类型';
	} else if (err.code == -602) {
		msg = '\n这个文件已经上传过一遍了';
	}
	else {
		msg = '\nError xml:' + err.response;
	}
	document.getElementById('console').appendChild(document.createTextNode(msg));
}

function set_upload_param(up) {
	return $.get('/getPolicy').then(function (data) {
		dir = data.dir;
		let option = up.getOption('multipart_params') || {};
		option.policy = data.policy;
		option.OSSAccessKeyId = data.accessid;
		option.success_action_status = '200';
		option.callback = data.callback;
		option.signature = data.signature;
		up.setOption('multipart_params', option);
		up.setOption({
			'url': data.host,
			'multipart_params': option
		});
	});
}

function hexToBinaryString(hex) {
	let bytes = [];

	for (let x = 0; x < hex.length - 1; x += 2) {
		bytes.push(parseInt(hex.substr(x, 2), 16));
	}

	return String.fromCharCode.apply(String, bytes);
}

function getFileMD5(file, callback) {
	let blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice,
		chunkSize = 2097152, // Read in chunks of 2MB
		chunks = Math.ceil(file.size / chunkSize),
		currentChunk = 0,
		spark = new SparkMD5.ArrayBuffer(),
		fileReader = new FileReader();
	fileReader.onload = function (e) {
		spark.append(e.target.result); // Append array buffer
		currentChunk++;
		if (currentChunk < chunks) {
			loadNext();
		} else {
			let md5_value = spark.end();
			// document.getElementById('console').appendChild(document.createTextNode('\n本地计算[' + file.name + ']MD5值为：' + md5_value));
			if (callback) {
				//3749f52bb326ae96782b42dc0a97b4c1
				//7Iõ+³&®x+BÜ ´Á
				callback(md5_value);
			}
		}
	};
	fileReader.onerror = function () {
		console.warn('oops, something went wrong.');
	};

	function loadNext() {
		let start = currentChunk * chunkSize,
			end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
		fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
	}

	loadNext();
}