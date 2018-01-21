const fs = require('fs'),
childprocess = require('child_process'),
config = require('./config'),
utils = require('./utils');

module.exports = {
    ffmpeg: null,
    //第一个子数组为支持直接预览的格式，第二个需要转码
    formats: {
        image: [['jpg','jpeg','png','gif','webp','svg','ico','bmp','jps','mpo'],['tga','psd','iff','pbm','pcx','tif']],
        video: [['mp4','ogg','webm'],['ts','flv','mkv','rm','mov','wmv','avi','rmvb']],
        audio: [['aac','mp3','wav','mpeg'],['wma','mid']]
    },
    is(ext,name,bool){
        if(!bool){
            return this.formats[name][0].indexOf(ext) !== -1;
        }
        return this.formats[name][0].indexOf(ext) !== -1 && this.formats[name][1].indexOf(ext) !== -1;
    },
    metadata(url,success,fail){
        let ext = url.slice(url.lastIndexOf('.')+1).toLowerCase(),
            json = {
                duration: 0,
                bit: 0,
                bitv: 0,
                bita: 0,
                width: 0,
                height: 0,
                fps: 0,
                ext: ext,
                type: null
            },
            status = true,

            ffmpeg = childprocess.exec(config.ffmpegRoot+'/ffmpeg.exe -hide_banner -i "'+url+'" -vframes 1 -f null -', (err,stdout, stderr)=>{
                // console.log(stderr.toString());
            let lines = stderr.split(/\n/), i = 0, len = lines.length, line, match;

            for(; i < len; i++){
                line = lines[i].trim();
                if(/(^stream\s*mapping)|(^output)/i.test(line)) break;
                if( match = /^duration\s*:\s*([\s\S]*?)\s*,[\s\S]*?bitrate\s*:\s*([\d\.]+)\s*kb\/s$/i.exec( line ) ){
                    let times = match[1].toString().split(':');
                    json.duration = parseInt(times[0])*3600 + parseInt(times[1])*60 + parseFloat(times[2]);
                    json.bit = parseFloat(match[2]);
                }
                else if(match = /^stream[\s\S]*?video\s*:\s*([\s\S]*?)$/i.exec( line )){
                    let size, fps, bitv;
                    if( size = /,\s*(\d+)x(\d+)/i.exec(match[1]) ){
                        json.width = parseFloat(size[1]);
                        json.height = parseFloat(size[2]);
                    }
                    if( fps = /,\s*([\d\.]+)\s*fps\s*,/i.exec(match[1]) ){
                        json.fps = parseFloat(fps[1]);
                    }
                    if( bitv = /,\s*([\d\.]+)\s*kb\/s/i.exec(match[1]) ){
                        json.bitv = parseFloat(bitv[1]);
                    }
                }
                else if(match = /^stream[\s\S]*?audio\s*:[\s\S]*?([\d\.]+)\s*kb\/s/i.exec( line ) ){
                    json.bita = parseFloat(match[1]);
                }
            }

            if(json.width > 0 && json.height > 0){
                if(json.fps === 0 || json.ext === 'gif'){
                    json.type = 'image';
                }else{
                    json.type = 'video'; 
                }
            }else if(json.bita > 0){
                json.type = 'audio';
            }

            if(json.bit <= 0){
                json.bit = json.bita + json.bitv;
            }

        }).once('close',(a,b)=>{
            if(a === 0){
                if(success) success(json);
            }else{
                if(status && fail){
                    status = false;
                    fail(a,b);
                }
            }
        }).once('error', (err)=>{
            try{
                ffmpeg.kill();
            }catch(e){}
            if(status && fail){
                status = false;
                fail(err);
            }
        });
    },
    thumb(o){
        let wmax = o.widthLimit || 480,
            w = o.width || wmax,
            h = o.height || wmax*.5625,
            format = o.format === 'jpg' ? 'image2' : (o.format === 'gif' ? 'gif': 'apng'),
            status = true,
            ffmpeg,
            thumb;
        if(w > wmax){
            h = Math.round((o.height/o.width)*wmax);
            w = Math.round(wmax);
        }
        if(h%2 !== 0) h--;
        if(w%2 !== 0) w--;
        ffmpeg = childprocess.exec(config.ffmpegRoot+'/ffmpeg.exe -ss '+(o.time || '00:00:00')+' -i "'+o.input+'" -vframes 1 -s '+w+'x'+h+' -y  -f '+format+' "'+config.appRoot+'cache/thumb"',(err,stdout,stderr)=>{
            if(!err){
                let tmp = fs.readFileSync(config.appRoot+'cache/thumb');
                thumb = window.URL.createObjectURL(new Blob([tmp], {type:'image/'+o.format}));
                tmp = null;
            }else{
                if(status && o.fail){
                    status = false;
                    o.fail(err);
                }
            }
        }).once('close', (a,b)=>{
            if(a === 0){
                o.success(thumb);
            }else{
                if(status && o.fail){
                    status = false;
                    o.fail(a,b);
                }
            }
        }).once('error', (e)=>{
            try{
                ffmpeg.kill();
            }catch(e){}
            if(status && o.fail){
                status = false;
                o.fail(e);
            }
        });
    },
    info(o){
        let self = this;
        if(!o.input) {
            utils.dialog('地址错误：','<p>无效媒体文件地址!</p>');
            return;
        }
        if(!o.success) return;
        self.metadata(o.input,(json)=>{
            json.thumb = '';
            if(json.type === 'audio'){
                json.thumb = config.audioThumb;
                o.success(json);
            }else{
                if(self.is(json.ext,'image')){
                    json.thumb = o.input;
                    o.success(json);
                }else{
                    self.thumb({
                        widthLimit: o.widthLimit,
                        format: o.format,
                        input: o.input,
                        width: json.width,
                        height: json.height,
                        success(thumb){
                            json.thumb = thumb;
                            o.success(json);
                        },
                        fail(a,b){
                            o.fail(a,b);
                        }
                    });
                }
            }
        }, o.fail);
    },
    killAll(fn){
        childprocess.exec('TASKKILL /F /IM ffmpeg.exe', (err,stdout, stderr)=>{
            if(fn) fn(stderr.toString());
        });
    },
    onExists(file, stderr, stdin){
        let self = this;
        self.exitCode = 0;
        if(/File[\s\S]*?already[\s\S]*?exists[\s\S]*?Overwrite[\s\S]*?\[y\/N\]/i.test(stderr.toString())){
            utils.dialog(
                '提示：',
                '<p>文件：'+file+'已存在，是否覆盖？<p>',
                ['覆盖','退出'],
                (code)=>{
                    if(code === 0){
                        stdin.write('y\n');
                    }else{
                        stdin.write('N\n');
                    }
                    self.exitCode = 1;
                });
        }
    },
    convert(o){
        let self = this,
            cammand = '-hide_banner|'+(o.seek ? '-ss|'+o.seek+'|' : '')+'-i|'+o.input+'|'+(o.cammand || '')+(o.duration ? '|-t|'+o.duration : '')+'|'+o.output+(o.thumbCmd || ''),
            errmsg = '',
            percent = 0,
            time = 0,
            line;
        if(self.ffmpeg){
            o.complete(2,'退出码：2，详细：有视频解转码尚未完成，是否中止？');
            return;
        }
        self.ffmpeg = childprocess.spawn(config.ffmpegRoot+'/ffmpeg.exe', cammand.split(/\|+/));
        self.ffmpeg.stderr.on('data', (stderr)=>{
            self.onExists(o.output, stderr, self.ffmpeg.stdin);
            line = stderr.toString()
            errmsg += line;
            time = line.match(/time=\s*([\d\.:]+)\s+/i);
            if(time){
                time = utils.timemat(time[1]);
                if(o.duration){
                    percent = Math.round(100*time/(o.duration*1000));
                }else{
                    percent = 100;
                }
            }
            o.progress(percent);
        });
        self.ffmpeg.once('close', function(a,b){
            self.ffmpeg.kill();
            self.ffmpeg = null;
            if(a === 0){
                o.complete(0, o.output);
            }else{
                if(self.exitCode === 1) return;
                o.complete(1, '退出码：1，详细：'+errmsg);
            }
        });
        self.ffmpeg.on('error', function(){
            self.ffmpeg.kill();
            self.ffmpeg = null;
            o.complete(3, '退出码：3，详细：'+errmsg);
        });
    },
    exitCode: 0,
    compressImg(o){
        let self = this,
            w = 0,
            h = 0;
        self.metadata(o.input, (json)=>{
            w = json.width;
            h = json.height;
            if(w > config.output.width){
                h = Math.round(config.output.width*h/w);
                w = config.output.width;
            }

            o.complete(0);

            self.ffmpeg = childprocess.spawn(config.ffmpegRoot+'/ffmpeg.exe', ['-hide_banner','-i', o.input, '-s', w+'x'+h, '-compression_level', Math.round((1-o.quality)*100), o.output]);
            self.ffmpeg.stderr.on('data', (stderr)=>{
                self.onExists(o.output, stderr, self.ffmpeg.stdin);
            });
            self.ffmpeg.once('close',(a,b)=>{
                self.ffmpeg.kill();
                self.ffmpeg = null;
                if(a === 0){
                    o.complete(100);
                }else{
                    if(self.exitCode === 0) return;
                    utils.dialog('失败：','<p>压缩失败！</p>');
                }
            });
            self.ffmpeg.once('error',()=>{
                self.ffmpeg.kill();
                self.ffmpeg = null;
                utils.dialog('失败：','<p>错误！</p>');
            });
        }, (msg)=>{
            utils.dialog('失败：','<p>获取媒体元数据信息失败！</p>');
        });
    }
};