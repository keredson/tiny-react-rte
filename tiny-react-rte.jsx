
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

  del: function(start_path, end_path, ret_path) {
    console.log('del', this, start_path, end_path);
    if (start_path.length==0 && end_path.length==0) return this;
    if (start_path[0]==end_path[0] && this.children) {
      var i = start_path[0];
      var children = this.children.slice(0, i);
      var new_start_path = start_path.slice(1);
      var new_end_path = end_path.slice(1);
      children.push(this.children[i].del(new_start_path, new_end_path, ret_path));
      children = children.concat(this.children.slice(i+1));
      console.log('a')
      ret_path.unshift(i);
      return new TinyReactRTENode(this.id, this.type, children);
    } else if (this.value!=null) {
      var s = this.value.slice(0, start_path[0]) + this.value.slice(end_path[0]);
      console.log('b')
      ret_path.unshift(start_path[0]);
      return new TinyReactRTENode(this.id, this.type, null, s);
    } else {
      var children = this.children.slice(0, start_path[0]);
      var left = this.children[start_path[0]].keepLeft(start_path.slice(1));
      var right = this.children[end_path[0]].keepRight(end_path.slice(1));
      console.log('right', right)
      if (left.children && right!=null && right.children) {
        children.push(left.merge(right));
      } else {
        children.push(left);
        if (right!=null) children.push(right);
      }
      children = children.concat(this.children.slice(end_path[0]+1));
      console.log('d', children)
      for (var i=start_path.length-1; i>=0; --i) {
        ret_path.unshift(start_path[i]);
      }
      return new TinyReactRTENode(this.id, this.type, children);
    }
  },

  insert: function(insert_path, v, ret_path) {
    console.log('insert', this, insert_path, v, ret_path)
    if (insert_path.length > 1) {
      ret_path.push(insert_path[0]);
      var children = this.children.slice(0, insert_path[0]);
      children.push(this.children[insert_path[0]].insert(insert_path.slice(1), v, ret_path));
      children = children.concat(this.children.slice(insert_path[0]+1));
      console.log('children', children)
      return new TinyReactRTENode(this.id, this.type, children);
    } else {
      if (typeof v == 'string') {
        var s = this.value.slice(0,insert_path[0]) + v + this.value.slice(insert_path[0]);
        ret_path.push(insert_path[0] + v.length);
        console.log('todoxxxx', s)
        return new TinyReactRTENode(this.id, this.type, null, s);
      } else {
        var right = this.value==null ? new TinyReactRTENode(null, 'span', this.children.slice(insert_path[0])) : new TinyReactRTENode(null, null, null, this.value.slice(insert_path[0]));
        console.log('middle', v)
        console.log('right', right)
        if (insert_path[0]==0) {
          ret_path.push(1);
          ret_path.push(0);
          return new TinyReactRTENode(this.id, 'span', [v, right]);
        } else {
          var left = new TinyReactRTENode(null, null, null, this.value.slice(0,insert_path[0]));
          console.log('left', left)
          ret_path.push(2);
          ret_path.push(0);
          return new TinyReactRTENode(this.id, 'span', [left, v, right]);
        }
      }
    }
  },
  
  merge: function(right) {
    var left = this;
    console.log('merge', left, right)
    if (left.type==right.type) {
      return new TinyReactRTENode(left.id, left.type, left.children.concat(right.children));
    } else {
      var children = left.children.slice(0);
      children.push(right);
      return new TinyReactRTENode(left.id, left.type, children);
    }
  },
  
  keepLeft: function(path) {
    console.log('keepLeft', this, path)
    if (this.value!=null) return new TinyReactRTENode(this.id, this.type, null, this.value.slice(0,path[0]));
    var children = this.children.slice(0, path[0]);
    children.push(this.children[path[0]].keepLeft(path.slice(1)));
    return new TinyReactRTENode(this.id, this.type, children);
  },

  keepRight: function(path) {
    console.log('keepRight', this, path)
    if (this.value!=null) {
      if (path[0] >= this.value.length) return null;
      return new TinyReactRTENode(this.id, this.type, null, this.value.slice(path[0]));
    }
    var children = this.children.slice(path[0]+1);
    var x = this.children[path[0]].keepRight(path.slice(1));
    if (x!=null) children.unshift(x);
    if (children.length==0) return null;
    return new TinyReactRTENode(this.id, this.type, children);
  },
  
  strip: function() {
    if (this.children!=null) {
      this.children = this.children.map(function(c) {return c.strip();}).filter(function(c) {return c!=null});
    }
    if (!this.value && NODES_NO_CHILDREN.indexOf(this.type)==-1 && (this.children==null || this.children.length==0)) return null;
    return this;
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

var ALLOWED_NODES = ['p','div','i','em','b','br','h1','h2','h3','h4','h5','a', 'ul', 'li','img','u','strong','blockquote','span','table','tr','td','tbody','thead','ol','pre','code','article','hr'];
var ALLOWED_ATTRIBUTES = {'a':['href'], 'img':['src']};
var NODES_NO_CHILDREN = ['br','img','hr'];

function domToReact(node) {
  if (node.nodeType==3) return node.nodeValue;
  console.log(node.nodeName)
  var nodeName = node.nodeName.toLowerCase();
  if (ALLOWED_NODES.indexOf(nodeName) < 0) return '';
  var children = null;
  if (NODES_NO_CHILDREN.indexOf(nodeName) == -1) {
    children = toArray(node.childNodes).map(function(n) {
      return domToReact(n);
    });
  }
  return new TinyReactRTENode(null, nodeName, children);
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
    var path = this.state.push_selection;
    if (path==null) return;
    console.log('push_selection', path);
    var node = this.state.content;
    console.log(node);
    for(var i=0; i<path.length-2; ++i) {
      node = node.children[path[i]];
      console.log(node);
    }
    var dom = document.getElementById(node.id);
    var children = toArray(dom.childNodes).filter(function(n) {return n.nodeType != Node.COMMENT_NODE});
    console.log('dom', node.id, dom, dom.textContent, path[path.length-1], children)
    dom = children[path[path.length-2]];
    var range = document.createRange();
    var selection = window.getSelection();
    range.setStart(dom, path[path.length-1]);
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
    var v = e.key;
    if (v=='Enter') v = new TinyReactRTENode(null, 'br');
    var ret_path = []
    content = content.del(this.state.start_path, this.state.end_path, ret_path);
    var insert_path = ret_path;
    ret_path = []
    content = content.insert(insert_path, v, ret_path);
//    this.saveState();
    this.setState({content:content, push_selection:ret_path});
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
  },
  
  onClick: function(e) {
  },

  onKeyDown: function(e) {
    if (e.key=="Unidentified") return;
    if (e.key=="ArrowUp" || e.key=="ArrowDown" || e.key=="ArrowLeft" || e.key=="ArrowRight") return;
    if (this.state.is_range && (e.key=="Backspace" || e.key=="Delete")) {
      e.preventDefault();
      var ret_path = []
      var content = this.state.content.del(this.state.start_path, this.state.end_path, ret_path);
      this.setState({content:content, push_selection:ret_path});
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
  
  strip: function(content) {
    var newContent = content.strip();
    if (newContent==null) newContent = new TinyReactRTENode(content.id, null, null, '');
    return newContent;
  },
  
  onPaste: function(e) {
    e.stopPropagation();
    e.preventDefault();
    var html = e.clipboardData.getData('text/html');
    var text = e.clipboardData.getData('text/plain') || e.clipboardData.getData('Text');
    console.log('onPaste', html || text);
    var value = html ? this.parseHTML(html) : text;
    var content = this.state.content;
    var ret_path = []
    content = content.del(this.state.start_path, this.state.end_path, ret_path);
    var insert_path = ret_path;
    ret_path = []
    content = content.insert(insert_path, value, ret_path);
//    this.saveState();
    this.setState({content:content, push_selection:ret_path});
  },
  
  calc_display_path: function() {
    var path = this.state.start_path;
    if (path==null) return [];
    var ret = [];
    var node = this.state.content;
    for (var i=0; i<path.length; ++i) {
      if (node.type) ret.push(node.type);
      if (i<path.length-1) node = node.children[path[i]];
    }
    return ret;
  },
    
  render: function() {
    var content = this.state.content;
    console.log('render', content)
    var display_path = this.calc_display_path().map(function(x,i) {return (<span key={i}><span style={{color:'#bbb'}}>&nbsp;&gt;&nbsp;</span>{x}</span>);});
    return (
      <div>
        <div style={{borderBottom:'1px solid #eee', color:'#777', fontSize:'smaller'}}><code>{display_path}</code></div>
        <div contentEditable="true" suppressContentEditableWarning="true" ref="root" style={{outline:"0px solid transparent", minHeight:'1.2em'}} 
          onKeyUp={this.onKeyUcp} onKeyDown={this.onKeyDown} onKeyPress={this.onKeyPress} onClick={this.onCclick} onSelect={this.onSelect} onPaste={this.onPaste}>
          {content.toReact()}
        </div>
        {this.props.showMarkup ? (
          <pre style={{borderTop:'1px solid #eee', marginTop:'1em', marginBottom:'0em', paddingTop:'1em', overflowX:'scroll'}}>
            {content.toHTML(this.state.start_path, this.state.end_path)}
          </pre>
        ) : ''}
      </div>
      
    );
  }

})

window.TinyReactRTE = TinyReactRTE;

