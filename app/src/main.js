const win = nw.Window.get();
const config = require('./config');
const Media = require('./Media');
const utils = require('./utils');
const capture = require('./capture');
const crypto = require('crypto');
const videoEl = document.createElement('video');

const showThumb = (item)=>{
    if(!item) return;
    Media.thumb({
        input: item.path,
        time: item.currentTime,
        success(src){
            item.thumb = src;
        },
        fail(){
            console.log(arguments);
        }
    });
};

const vue = new Vue({
	el: '#app',
	data: {
        appInfo: config.appInfo,
		items: {},
		output: config.output.folder,
		isFullScreen: true,
		defwidth: config.output.width,
		dropSlidedown: false,
		nameAll: 'fup',
        editable: false,
        listPanel: false,
		widthLimit: 1280,
		heightLimit: 720,
		sizeLimit: 0,
		speeds: {
			ultrafast: '无敌快',
			superfast: '超级快',
			veryfast: '非常快',
			faster: '比较快',
			fast: '正常快',
			medium: '普通',
			slow: '正常慢',
			slower: '比较慢',
			veryslow: '非常慢',
			placebo: '超级慢'
		},
        speedLevel: 'slow',
        mediaIcon: {
            image: 'icon-image',
            video: 'icon-video-camera',
            audio: 'icon-headphones'
        },
        alpha: false,
        tunstep: 2
	},
	methods: {
		minimize(){
			win.minimize();
		},
		wintoggle(){
			let w = screen.availWidth, h = screen.availHeight;
            if(win.width < w || win.height < h){
                win.maximize();
                vue.isFullScreen = true;
            }else{
                win.resizeTo(w*.8, h*.8);
                vue.isFullScreen = false;
            }
		},
		winclose(){
			win.close(true);
            win = null;
		},
		chosefile(e){
			let files = e.target.files,
				i = 0,
                item,
                md5;
			if(files && files.length){
				recycle(files[0]);
				function recycle(file){
                    md5 = crypto.createHash('md5');
                    md5.update(file.path);
                    md5 = md5.digest('hex');

                    item = {
                        path: file.path,
                        thumb: config.loadingGif,
                        canplay: !!videoEl.canPlayType(file.type),
                        playing: 0,
                        progress: 0,
                        lock: 1,
                        editable: 0,
                        bitv: 0,
                        bita: 0,
                        type: '',

                        duration: 0,
                        starttime: 0,
                        endtime: 0,
                        currentTime: 0,
                        covertime: 0,

                        name: file.name,
                        toname: file.name.slice(0, file.name.lastIndexOf('.')),

                        size: file.size,
                        tosize: file.size,

                        width: 0,
                        towidth: 0,
                        height: 0,
                        toheight: 0,

                        format: '',
                        toformat: '',

                        fps: 0,
                        tofps: 0
                    };

                    vue.$set(vue.items, md5, item);

					Media.info({
						input: file.path,
						success: (json)=>{
                            item.thumb = json.thumb;
                            item.bitv = json.bitv && json.bitv <= config.output.bitv ? json.bitv : config.output.bitv;
                            item.bita = json.bita && json.bita <= config.output.bita ? json.bita : config.output.bita;
                            item.type = json.type;

                            item.duration = json.duration;
                            item.endtime = json.duration;

                            item.tosize = (item.bitv+item.bita)*1000*item.duration/8;

							item.width = json.width;
                            item.towidth = item.width > vue.defwidth ? vue.defwidth : item.width;
							item.height = json.height;
                            item.toheight = json.width ? Math.round(item.towidth * (item.height/item.width) ) : 0;

							item.format = json.ext;
                            item.toformat = Media.is(item.format, item.type) ? item.format : config.output.format[ item.type ];

                            item.fps = json.fps;
                            item.tofps = json.fps;

							i++;
							if(files[i]) recycle(files[i]);
						},
						fail: (err)=>{
                            utils.dialog('提示：',
                            '<p>文件：“'+file.name+'”可能不支持！错误信息：'+err+'。是否保留以尝试转码？</p>',
                            ['是','否'],
                            (code)=>{
                                if(code === 1) vue.$delete(vue.items, md5);
                                i++;
                                if(files[i]) recycle(files[i]);
                            });
						}
					});
				}
			}
		},
		chosedir(e){
            vue.output = e.target.files[0].path || '';
        },
        itemFn(e, index, str){
        	let item = vue.items[index],
                target = e.target,
                step = (1/item.fps)*vue.tunstep,
                tmptime;
        	switch(str){
        		case 'del':
                    item.hide = true;
                    if(item.canplay)
                    item.video.pause();
                    break;
        		case 'edit':
                    item.editable = !item.editable;
                    break;
        		case 'lock':
                    item.lock = !item.lock;
                    break;
                case 'currentTime':
                    document.getElementById('id-'+index).pause();
                    item.currentTime = parseFloat(target.value);
                    break;
                case 'timeSlide':
                    if(item.canplay){
                        document.getElementById('id-'+index).currentTime = item.currentTime;
                    }else if(item.type === 'video'){
                        showThumb(item);
                    }
                    break;
                case 'prevFrame':
                    if(item.currentTime > step){
                        item.currentTime -= step;
                    }else{
                        item.currentTime = 0;
                    }
                    if(item.canplay){
                        let video = document.getElementById('id-'+index);
                        video.pause();
                        video.currentTime = item.currentTime;
                    }else if(item.type === 'video'){
                        showThumb(item);
                    }
                    break;
                case 'nextFrame':
                    if(item.currentTime < item.duration - step){
                        item.currentTime += step;
                    }else{
                        item.currentTime = item.duration;
                    }
                    if(item.canplay){
                        let video = document.getElementById('id-'+index);
                        video.pause();
                        video.currentTime = item.currentTime;
                    }else if(item.type === 'video'){
                        showThumb(item);
                    }
                    break;
                case 'setstart':
                    item.starttime = item.currentTime;
                    if(item.starttime > item.endtime){
                        item.endtime = item.starttime;
                    }
                    break;
                case 'setend':
                    if(item.currentTime < item.starttime){
                        item.starttime = item.currentTime;
                    }
                    item.endtime = item.currentTime;
                    break;
                case 'setcover':
                    item.covertime = item.currentTime;
                    break;
        		case 'towidth':
        			item.towidth = parseInt(target.value) || 0;
                    if(item.towidth > vue.widthLimit){
                        item.towidth = vue.widthLimit;
                    }
        			item.toheight = Math.round((item.height / item.width) * item.towidth);
        			break;
        		case 'toheight':
        			item.toheight = parseInt(target.value) || 0;
                    if(item.toheight > vue.heightLimit){
                        item.toheight = vue.heightLimit;
                    }
        			item.towidth = Math.round(item.toheight / (item.height / item.width));
        			break;
        	}
        },
        videoFn(e, index, type){
            let item = vue.items[index],
                video = e.target;
            switch(type){
                case 'timeupdate':
                    item.currentTime = video.currentTime;
                    break;
                case 'play':
                    item.playing = true;
                    break;
                case 'pause':
                    item.playing = false;
            }
        },
        listPanelFn(){
            vue.listPanel = !vue.listPanel;
        },
        alphaFn(){
            vue.alpha = !vue.alpha;
        },
        capture(e){
            capture.recorders((list)=>{
                let i = 0, len, html, dialog;
                if(list && (len = list.length) ){
                    html = '<select name="audioDevice">';
                    for(; i<len; i++){
                        if(i%2 === 0){
                            html += '<option value="'+list[i]+'">'+list[i]+'</li>';
                        }
                    }
                    html += '</select>';
                    dialog = utils.dialog('设置参数：',
                        `<h3>注意：若不了解以下参数的作用，请保持默认</h3>
                        <p>帧速率：<input name="fps" type="number" max="30" value="30"/></p>
                        <p>输出宽度范围：<input name="width" type="number" value="${vue.widthLimit}"/></p>
                        <p>视频输出比特率：<input name="bitv" type="number" value="${config.output.bitv}"/></p>
                        <p>音频输出比特率：<input name="bita" type="number" value="${config.output.bita}"/></p>
                        <p>内部音频录制设备：${html}</p>`,
                        ['下一步','取消'],
                        (code)=>{
                            if(code === 0){
                                capture.setArea({
                                    fps: parseInt(dialog.el.querySelector('[name=fps]').value),
                                    width: parseInt(dialog.el.querySelector('[name=width]').value),
                                    bitv: parseInt(dialog.el.querySelector('[name=bitv]').value),
                                    bita: parseInt(dialog.el.querySelector('[name=bita]').value),
                                    audioDevice: dialog.el.querySelector('[name=audioDevice]').value
                                });
                            }
                        });
                }else{
                    utils.dialog('提示：','<p>当前计算机没有可用的录音设备或者未开启，请查看帮助文档。</p>');
                }
            });
            
        },
        firstAid(){
            utils.dialog('警告：','<p>为了避免失误操作，必须谨慎选择是否真的启用急救，不到万不得已，请不要轻易启用！</p>',['启用','关闭'],(code)=>{
                if(code === 0){
                    Media.killAll((msg)=>{
                        utils.dialog('提示：','<p>所有可能的错误程序已被清除！<br>详细：'+msg+'</p>');
                    });
                }
            });
        },
        play(e, index){
            let item = vue.items[index],
                video;
            if(!item.canplay) return;
            video = e.target.parentNode.querySelector('video');
            video.currentTime = item.currentTime;
            if(video.paused){
                video.play();
            }else{
                video.pause();
            }
        },
        convert(index){
            if(Media.ffmpeg){
                utils.dialog('禁止：',
                    '<p>转码程序正在进行，如果不是错误，请不要选择“强行中断”！</p>',
                    ['关闭','强行中断'],
                    function(code){
                        if(code === 1){
                            Media.ffmpeg.kill();
                        }
                    });
                return;
            }
            /*
            情况分析：
                1.图片->图片: 
                2.gif->视频: 可添加音频
                3.视频->视频:
                4.视频->gif: 
                5.视频->音频: 
                6.视频->图片:
            */
            let i = index === -1 ? 0 : index,
                seek = 0,
                duration = 0,
                cammand,
                thumbCmd,
                output;
            function loop(item){
                if(item.hide){
                    i++;
                    if(vue.items[i]) loop(vue.items[i]);
                    return;
                }
                
                if(item.type === 'image'){
                    output = vue.output +'/' + item.toname +'.'+ item.toformat;
                    Media.compressImg({
                        input: item.path,
                        quality: item.size ? (item.tosize/item.size).toFixed(2) : .8,
                        output: output,
                        complete: (percent)=>{
                            item.progress = percent + '%';
                        }
                    });
                }else{
                    /*
                    duration = item.endtime - item.starttime;
                    if(duration > 0){
                        Media.convert({
                            input: item.path,
                            seek: seek,
                            duration: duration,
                            cammand: cammand,
                            output: vue.output +'/'+ item.toname + '.' + item.toformat,
                            thumbCmd: thumbCmd,
                            progress(percent){
                                item.progress = percent + '%';
                            },
                            complete(code,msg){
                                if(code === 0){
                                    item.progress = '100%';
                                    if(index === -1){
                                        i++;
                                        if(vue.items[i]) loop(vue.items[i]);
                                    }
                                }else{
                                    utils.dialog('退出：','<p>'+msg+'</p>');
                                    item.progress = '';
                                }
                            }
                        });
                    }*/
                }
                /*
                if(item.type === 'image' && !/\.gif$/i.test(item.path)){
                    seek = 0,
                    duration = 0;
                    cammand = '';
                    thumbCmd = '';
                }else{
                    seek = item.starttime;
                    duration = item.endtime - item.starttime;
                    if(duration > 0){
                        cammand = '-b:v|'+item.bitv+'k|-b:a|'+item.bita+'k|-preset|'+vue.speedLevel;
                        thumbCmd = '|'+(item.cover ? '-ss|'+item.cover+'|' : '')+'-vframes|1|-f|image2|'+vue.output +'/'+ item.toname + '.jpg';
                    }else{
                        // cammand = 
                        thumbCmd = '';
                    }
                }
                Media.convert({
                    input: item.path,
                    seek: seek,
                    duration: duration,
                    cammand: cammand,
                    output: vue.output +'/'+ item.toname + '.' + item.toformat,
                    thumbCmd: thumbCmd,
                    progress(percent){
                        item.progress = percent + '%';
                    },
                    complete(code,msg){
                        if(code === 0){
                            item.progress = '100%';
                            if(index === -1){
                                i++;
                                if(vue.items[i]) loop(vue.items[i]);
                            }
                        }else{
                            utils.dialog('退出：','<p>'+msg+'</p>');
                            item.progress = '';
                        }
                    }
                });
                */
            };
            if(vue.items[i])
            loop(vue.items[i]);
        },
        nameAllFn(e){
        	vue.nameAll = e.target.value;
        	let item, i = 0;
            for(k in vue.items){
                item = vue.items[k];
                i++;
                if(item.lock){
                    item.toname = utils.namemat(vue.nameAll, i);
                }
            }
        },
        allEditable(){
            vue.editable = !vue.editable;
            let item, i = 0;
            for(k in vue.items){
                item = vue.items[k];
                i++;
                if(item.lock){
                    item.editable = vue.editable;
                }
            }
        },
        sizeLimitFn(e){
        	vue.sizeLimit = e.target.value;
        	let len = vue.items.length, i = 0, n = 0;
        	for(; i < len; i++){
        		if(vue.items[i].lock){
        			n = utils.sizemat(e.target.value, true);
        			vue.items[i].tosize = n < vue.items[i].size ? n : vue.items[i].size;
        		}
        	}
		},
		whLimitFn(e,n){
			vue[n+'Limit'] = parseInt(e.target.value);
			let len = vue.items.length, i = 0;
        	for(; i < len; i++){
        		if(vue.items[i].lock){
        			vue.items[i]['to'+n] = vue[n+'Limit'] < vue.items[i][n] ? vue[n+'Limit'] : vue.items[i][n];
        		}
        	}
		},
        gotoSetAll(){
        	vue.dropSlidedown = !vue.dropSlidedown;
        }
	},
	filters: {
		timemat(t){
			return utils.timemat(t*1000);
		},
		sizemat(val,attr){
			if(attr === 'size'){
				return utils.sizemat(val);
			}else if(typeof attr === 'number'){
                return Math.round(parseFloat(val/attr)*100) + '%';
            }else{
				let tmp = parseFloat(val).toFixed(2);
				if(tmp){
					return utils.sizemat(tmp);
				}
			}
			return 'auto';
		},
        mathRound(val){
            return Math.round(val);
        }
	},
    directives: {
        child: {
            bind(el, binding){
                el.innerHTML = '';
                el.appendChild(binding.value);
            }
        }
    }
});