const win = nw.Window.get();
const config = require('./src/config');
const Media = require('./src/Media');
const functions = require('./src/functions');
new Vue({
	el: '#app',
	data: {
		items: [],
		output: config.output.folder,
		isFullScreen: true,
		defwidth: config.output.width
	},
	methods: {
		minimize: function(){
			win.minimize();
		},
		wintoggle: function(){
			let w = screen.availWidth, h = screen.availHeight;
            if(win.width < w){
                win.width = w;
                win.height = h;
                win.x = 0;
                win.y = 0;
                this.isFullScreen = true;
            }else{
                win.width = w*.8;
                win.height = h*.8;
                win.x = w*.1;
                win.y = h*.1;
                this.isFullScreen = false;
            }
		},
		winclose: function(){
			win.close();
		},
		chosefile: function(e){
			let vue = this,
				files = e.target.files,
				len,
				file,
				infostr;
			if(files && (len = files.length)){
				for(let i=0; i<len; i++){
					(function(file){
						let extend = file.name.slice(file.name.lastIndexOf('.')+1),
						itemO = {
							path: config.appRoot+'css/loading.gif',
							name: file.name,
							size: functions.sizemat(file.size),
							width: 0,
							height: 0,
							duration: 0,
							format: extend,
							progress: 0,
							progressColor: '',
							editable: true,

							toname: 'fup-'+file.name,
							tosize: 0,
							towidth: vue.defwidth,
							toheight: Math.round(vue.defwidth*0.5625),
							toformat: extend,
							toformats: [],
							maxtime: 0,
							curtime: 0,
							starttime: 0,
							endtime: 0
						};
						vue.items.push(itemO);

						Media.info(file.path, function(md) {
							itemO.path = md.source;
							itemO.width = md.width || 0;
							itemO.height = md.height || 0;
							itemO.duration = md.duration;
							itemO.towidth = itemO.width > vue.defwidth ? vue.defwidth : itemO.width;
							itemO.toheight = md.width ? Math.round(itemO.towidth * (itemO.height/itemO.width) ) : 0;
							itemO.maxtime = md.duration;
							itemO.endtime = md.duration;
							itemO.toformats = md.toformats;
							itemO.toformat = config.output.format[md.mediaType];
						});
					})(files[i]);
				}
			}
		},
		chosedir: function(e){
            this.output = config.ui.saveas + (e.target.files[0].path || '');
        },
        itemFn: function(index, str){
        	let item = this.items[index];
        	switch(str){
        		case 'del': this.items.splice(index,1); break;
        		case 'edit': item.editable = !item.editable; break;
        		case 'setstart': item.starttime = item.curtime; break;
        		case 'setend': item.endtime = item.curtime; break;
        		case 'convert':
        			let pv = 0, r = 225, g = 0;
        			let tt = setInterval(function(){
        				if(pv>=100) clearInterval(tt);
        				pv++;
        				item.progress = pv + '%';
        				if(g < 150){
        					g += 3;
        				}else{
        					r -= 3;
        				}
        				item.progressColor = 'rgba('+r+','+g+',0,0.5)';
        			},100);
        			console.log(item.starttime, item.endtime);
        			break;
        	}
        },
        startConvert: function(){
        	console.log('start');
        	
        }
	},
	filters: {
		timemat: function(t){
			return functions.timemat(t*1000);
		}
	}
});
