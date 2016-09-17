
var TinyReactRTENode = function(id, type, children, value) {
  this.id = id ? id : type +'-'+ Math.random().toString(36).substring(2);
  this.type = type;
  if (children!=null) {
    this.children = children.slice(0);
    for (var i=0; i<this.children.length; ++i) {
      if (typeof this.children[i] === 'string') {
        this.children[i] = new TinyReactRTENode(null, null, null, this.children[i])
      }
    }
  }
  if(!(value==null || typeof value === 'string')) throw "value must be string, not "+ value
  this.value = value;
  //if (this.value==null && this.children==null) throw "nothing here for type "+ type;
};

TinyReactRTENode.prototype = {

  replace: function(start_path, end_path, v) {
    console.log('replace', this, start_path, end_path, v);
    if (start_path[0]==end_path[0] && this.children) {
      var i = start_path[0];
      var children = this.children.slice(0, i);
      var new_start_path = start_path.slice(1);
      var new_end_path = end_path.slice(1);
      children.push(this.children[i].replace(new_start_path, new_end_path, v));
      children = children.concat(this.children.slice(i+1));
      console.log('a')
      return new TinyReactRTENode(this.id, this.type, children);
    } else if (this.value!=null) {
      if (typeof v === 'string') {
        var s = this.value.slice(0, start_path[0]) + v + this.value.slice(end_path[0]);
        console.log('b')
        return new TinyReactRTENode(this.id, this.type, null, s);
      } else {
        var children = [
          new TinyReactRTENode(null, null, null, this.value.slice(0, start_path[0])), 
          v,
          new TinyReactRTENode(null, null, null, this.value.slice(end_path[0]))
        ];
        console.log('c', children)
        return new TinyReactRTENode(this.id, 'div', children);
      }
    } else {
      var children = this.children.slice(0, start_path[0]);
      var left = this.children[start_path[0]].keepLeft(start_path.slice(1));
      var right = this.children[end_path[0]].keepRight(end_path.slice(1));
      if (left.children && right.children && !v) {
        children.push(left.merge(right));
      } else {
        children.push(left);
        if (v!=null) {
          if (typeof v === 'string') children.push(new TinyReactRTENode(null, null, null, v));
          else children.push(v);
        }
        children.push(right);
      }
      children = children.concat(this.children.slice(end_path[0]+1));
      console.log('d', children)
      return new TinyReactRTENode(this.id, this.type, children);
    }
  },
  
  merge: function(right) {
    var left = this;
    console.log('merge', left, right)
//    if (left.children==null) left = new TinyReactRTENode(left.id, left.type, [left.value]);
//    if (right.children==null) right = new TinyReactRTENode(right.id, right.type, [right.value]);
    return new TinyReactRTENode(left.id, left.type, left.children.concat(right.children));
  },
  
  keepLeft: function(path) {
    console.log('keepLeft', this, path)
    if (path.length==1) return new TinyReactRTENode(this.id, this.type, null, this.value.slice(0,path[0]));
    var children = this.children.slice(0, path[0]);
    children.push(this.children[path[0]].keepLeft(path.slice(1)));
    return new TinyReactRTENode(this.id, this.type, children);
  },

  keepRight: function(path) {
    console.log('keepRight', this, path)
    if (path.length==1) return new TinyReactRTENode(this.id, this.type, null, this.value.slice(path[0]));
    var children = this.children.slice(path[0]+1);
    children.unshift(this.children[path[0]].keepRight(path.slice(1)));
    return new TinyReactRTENode(this.id, this.type, children);
  },

  toReact: function() {
    if (!this.type) return this.value || String.fromCharCode(13);
    var children = this.children==null ? null : this.children.map(function(child) {
      if (child && child.toReact) return child.toReact();
      else return child;
    });
    var style = {whiteSpace:'pre-wrap'}
    var type = this.type;
    return React.createElement(type, {key:this.id, rte_id:this.id, id:this.id, style:style, type:this.type}, children);
  },
  
  toHTML: function(start_path, end_path) {
    var start_i = start_path && start_path.length ? start_path[0] : null;
    var end_i = end_path && end_path.length ? end_path[0] : null;
    if (!this.type) {
      var value = this.value || String.fromCharCode(13);
      if (end_i!=null) value = value.slice(0,end_i)+'$'+value.slice(end_i);
      if (start_i!=null) value = value.slice(0,start_i)+'^'+value.slice(start_i);
      return value;
    }
    var children = this.children==null ? [] : this.children.map(function(child, i) {
      var sp = i==start_i ? start_path.slice(1) : null;
      var ep = i==end_i ? end_path.slice(1) : null;
      if (child && child.toHTML) return child.toHTML(sp, ep);
      else return child;
    });
    var type = this.type;
    //console.log('start_i', start_i, end_i, this)
    
    return '<'+ type +'>'+ (end_i!=null && end_path.length==1 ? '$':'') + (start_i!=null && start_path.length==1 ? '^':'') +'\n' + this.indent(children.join('\n')) +'\n</'+ type +'>';
  },
  
  indent: function(s) {
    return s.split('\n').map(function(s) {return '  '+s}).join('\n');
  },
  
};


function toArray(obj) {
    var l = obj.length, out = [];
    for(var i=0; i<obj.length; ++i) out[i] = obj[i];
    return out;
}

var ALLOWED_NODES = ['P','DIV','I','EM','B','BR','H1','H2','H3','A', 'UL', 'LI', 'IMG', 'U', 'STRONG', 'BLOCKQUOTE', 'SPAN', 'TABLE', 'TR', 'TD','TBODY','OL','PRE','CODE','ARTICLE'];
var ALLOWED_ATTRIBUTES = {'A':['href'], 'IMG':['src']};
var NODES_NO_CHILDREN = ['BR', 'IMG'];

function domToReact(node) {
  if (node.nodeType==3) return node.nodeValue;
  console.log(node.nodeName)
  if (ALLOWED_NODES.indexOf(node.nodeName) < 0) return '';
  var children = null;
  if (NODES_NO_CHILDREN.indexOf(node.nodeName) == -1) {
    children = toArray(node.childNodes).map(function(n) {
      return domToReact(n);
    });
  }
  return new TinyReactRTENode(null, node.nodeName.toLowerCase(), children);
}



var TinyReactRTE = React.createClass({

  parseHTML: function(html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, "text/html");
    var newChildren = toArray(doc.body.childNodes).map(function(n) {
      return domToReact(n);
    });
    return new TinyReactRTENode(null, 'div', newChildren, this.value);
  },

  getInitialState: function() {
    var html = this.props.html;
    if (html==null) html = "<h1>Congrats!</h1><p>Your <b>TinyReactRTE</b> module is loading.  Now please set the <i><code>html</code></i> parameter to control this element. &nbsp; For example:</p><pre>  <code>&lt;TinyReactRTE html={\"yada yada yada...\"} /&gt;</code></pre><p>See?  Super easy!<br><a href='https://github.com/keredson/tiny-react-rte'>https://github.com/keredson/tiny-react-rte</a></p>"
    var content = this.parseHTML(html);
    return {
      content: content,
      history: [],
      start_path: null,
      end_path: null,
    };
  },

  getPath: function(node) {
    var path = [];
    while (!(node===this.refs.root)) {
      var position = -1;
      for (var elem=node; elem!=null; elem=elem.previousSibling) {
        if (elem.nodeType != Node.COMMENT_NODE && elem.className!='tiny-react-rte-control') ++position;
      }
      path.unshift(position);
      node = node.parentNode;
    }
    path = path.slice(1)
    console.log('path', path);
    return path;
  },
  
  componentDidUpdate: function() {
    this.push_selection();
  },
  
  push_selection: function() {
    var push_selection = this.state.push_selection;
    console.log('push_selection', push_selection);
    if (push_selection==null) return;
    var range = document.createRange();
    var selection = window.getSelection();
    push_selection = Math.min(selection.anchorNode.textContent.length, push_selection);
    range.setStart(selection.anchorNode, push_selection);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    this.setState({push_selection:null});
  },

  onKeyPress: function(e) {
    e.preventDefault();
    console.log('onKeyPress', e.key)
    var content = this.state.content;
    console.log('content', content);
    content = content.replace(this.state.start_path, this.state.end_path, e.key);
    console.log('content', content);
//    this.saveState();
    var push_selection = this.state.start_path[this.state.start_path.length-1] + 1;
    console.log('xcxpush_selection', push_selection)
    this.setState({content:content, push_selection:push_selection});
  },
  
  saveState: function() {
    var history = this.state.history.slice(0);
    history.push({
      content: this.state.content,
      selection: this.state.selection,
    })
    this.setState({history:history})
  },
  
  undo: function() {
    var history = this.state.history.slice(0);
    var state = history.pop();
    if (state) {
      this.setState({
        history: history,
        content: state.content,
        selection: state.selection,
      });
    }
  },

  componentDidMount: function() {
//    this.moveSelection();
  },
  
//  componentDidUpdate: function() {
//    this.moveSelection();
//  },
  
  moveSelection: function(path, node) {
    console.log('moveSelection', path, node)
    if (!path) {
      path = this.state.start_path;
      node = this.refs.root;
    }
    if (path.length==1) {
      var range = document.createRange();
      var sel = window.getSelection();
      range.setStart(node, path[0]);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      var p = path[0];
      var children = toArray(node.childNodes).filter(function(n) {return n.id});
      console.log('children', p, children)
      this.moveSelection(path.slice(1), children[path[0]]);
    }
  },
  
  onClick: function(e) {
  },

  onKeyDown: function(e) {
    if (e.key=="Unidentified") return;
    if (e.key=="ArrowUp" || e.key=="ArrowDown" || e.key=="ArrowLeft" || e.key=="ArrowRight") return;
    if (this.state.is_range && (e.key=="Backspace" || e.key=="Delete")) {
      e.preventDefault();
      var content = this.state.content.replace(this.state.start_path, this.state.end_path, '');
      var push_selection = this.state.start_path[this.state.start_path.length-1];
      this.setState({content:content, push_selection:push_selection});
    }
  },
  
  is_backward_selection: function(start_path, end_path) {
    var l = Math.min(start_path.length, end_path.length);
    for (var i=0; i<l; ++i) {
      if (end_path[i]==start_path[i]) continue;
      return end_path[i] < start_path[i];
    }
    return start_path.length > end_path.length;
  },
  
  onSelect: function(e) {
    console.log('onSelect');
    var selection = window.getSelection();
    var start_offset = selection.anchorOffset;
    var start_path = this.getPath(selection.anchorNode);
    start_path.push(start_offset);
    var end_path = this.getPath(selection.focusNode);
    var end_offset = selection.focusOffset;
    end_path.push(end_offset);
    var is_range = !(selection.anchorNode==selection.focusNode && start_offset==end_offset);
    var is_backward_selection = this.is_backward_selection(start_path, end_path);
    console.log('is_backward_selection', is_backward_selection)
    this.setState({
      start_path: is_backward_selection ? end_path : start_path,
      end_path: is_backward_selection ? start_path : end_path,
      is_range: is_range,
    });
  },
  
  onPaste: function(e) {
    e.stopPropagation();
    e.preventDefault();
    var html = e.clipboardData.getData('text/html');
    var text = e.clipboardData.getData('text/plain') || e.clipboardData.getData('Text');
    console.log('onPaste', html || text);
    var value = html ? this.parseHTML(html) : text;
    var content = this.state.content.replace(this.state.start_path, this.state.end_path, value);
    this.setState({content:content});
  },
  
    
  render: function() {
    return (
      <div>
        <div contentEditable="true" suppressContentEditableWarning="true" ref="root" style={{outline:"0px solid transparent", minHeight:'1.2em'}} 
          onKeyUp={this.onKeyUcp} onKeyDown={this.onKeyDown} onKeyPress={this.onKeyPress} onClick={this.onCclick} onSelect={this.onSelect} onPaste={this.onPaste}>
          {this.state.content.toReact()}
        </div>
        {this.props.showMarkup ? (
          <pre style={{borderTop:'1px solid #eee', marginTop:'1em', marginBottom:'0em', paddingTop:'1em', overflowX:'scroll'}}>
            {this.state.content.toHTML(this.state.start_path, this.state.end_path)}
          </pre>
        ) : ''}
      </div>
      
    );
  }

})

window.TinyReactRTE = TinyReactRTE;

