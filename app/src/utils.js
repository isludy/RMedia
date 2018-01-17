module.exports = {
    timemat(time){
        let t,
            mat = (n) => {
                return n < 10 ? '0'+n : n;
            };
        if(typeof time === 'string' && /^\d{2}:\d{2}:\d{2}([\.\d]*)$/.test(time)){
            t = time.split(':');
            return (parseInt(t[0]*3600) + parseInt(t[1]*60) + parseFloat(t[2])) * 1000;
        }else if(typeof time === 'number'){
            if(isNaN(time)) return '00:00:00';
            t = time / 1000;
            let h = Math.floor( t/3600 );
            let m = Math.floor( (t%3600) / 60 );
            let s = Math.floor( t%60 );
            return mat(h) + ':' + mat(m) + ':' + mat(s);
        }else{
            return "error time";
        }
    },
    datemat(time){
        let date;
        if(typeof time === 'number'){
            date = new Date(time);
        }else if(typeof time === 'string'){
            return new Date(time).getTime();
        }else{
            date = new Date();
        }
        return date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate()
    },
    sizemat(b, flag){
        if(!flag){
            if(b < 1024) return b + ' B';
            let size = b/1024,
                fixed = arguments[1] || 2;
            if(size < 1024){
                return size.toFixed(fixed) + ' KB';
            }else{
                return (size/1024).toFixed(fixed) + ' MB';
            }
        }else{
            if(/^[\d\.]+\s*KB$/.test(b)){
                return parseFloat(b)*1024;
            }else if(/^[\d\.]+\s*MB$/.test(b)){
                return parseFloat(b)*1024*1024;
            }else{
                return parseFloat(b);
            }
        }
    },
    namemat(str,n){
        if(/\d+$/g.test(str)){
            return str.replace(/\d+$/g, function(a){
                return (parseInt('1'+a) + n).toString().slice(1);
            });
        }
        return str + (100 + n).toString().slice(1);
    },
    dialog(title, msg, btns, fn, context){
        let div = document.createElement('div'),
            parentNode = context || document.body,
            html;
        div.className = 'dialog';
        html = `<div class="dialog-title">${title}<i class="icon icon-cross dialog-close"></i></div>
            <div class="dialog-body">${msg}</div>
            <div class="dialog-footer">`;
            
        if(btns){
            for( let i=0; i<btns.length; i++){
                html += '<button class="dialog-btn" name="'+i+'">'+btns[i]+'</button>';
            }
        }
        
        html += '</div>';
        div.innerHTML = html;
        function eventFn(e){
            if(/dialog-close/.test(e.target.className)){
                div.removeEventListener('click', eventFn);
                if(fn) fn.call(e.target,-1);
                parentNode.removeChild(div);
                return;
            }else if(/dialog-btn/.test(e.target.className)){
                div.removeEventListener('click', eventFn);
                if(fn) fn.call(e.target, parseInt(e.target.name));
                parentNode.removeChild(div);
            }
        }
        div.addEventListener('click', eventFn);
        parentNode.appendChild(div);
        return {
            el: div,
            remove(){
                parentNode.removeChild(div);
                div.removeEventListener('click', eventFn);
            }
        };
    },
    draggable(node, dragnode){
        let sx = 0,
            sy = 0,
            ol = node.offsetLeft,
            ot = node.offsetTop;
        dragnode.addEventListener('mousedown', function(e){
            e.preventDefault();
            sx = e.clientX;
            sy = e.clientY;
            ol = node.offsetLeft;
            ot = node.offsetTop;
            dragnode.addEventListener('mousemove', moveFn, false);
            document.addEventListener('mouseup', endFn, false);
        }, false);
        function moveFn(e){
            e.preventDefault();
            node.style.left = (e.clientX - sx + ol) + 'px';
            node.style.top = (e.clientY - sy + ot) + 'px';
        }
        function endFn() {
            dragnode.removeEventListener('mousemove', moveFn, false);
            document.removeEventListener('mouseup', endFn, false);
        }
    }
};
