// 实现KVue构造函数
function defineReactive(obj, key, val) {
  // 如果val是对象，需要递归处理之
  observe(val);
  // 管家创建
  const dep = new Dep();
  Object.defineProperty(obj, key, {
    get() {
      console.log("get", key);
      // 依赖收集
      Dep.target && dep.addDep(Dep.target);
      return val;
    },
    set(newVal) {
      if (val !== newVal) {
        // 如果newVal是对象，也要做响应式处理
        observe(newVal);
        val = newVal;
        console.log("set", key, newVal);
        // 通知更新
        dep.notify();
      }
    },
  });
}
// 遍历指定数据对象每个key，拦截他们
function observe(obj) {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }
  // 每遇到⼀个对象，就创建⼀个Observer实例
  // 创建⼀个Observer实例去做拦截操作
  new Observer(obj);
}
// proxy代理函数：让⽤户可以直接访问data中的key
function proxy(vm, key) {
  Object.keys(vm[key]).forEach((k) => {
    Object.defineProperty(vm, k, {
      get() {
        return vm[key][k];
      },
      set(v) {
        vm[key][k] = v;
      },
    });
  });
}
// 根据传⼊value类型做不同操作
class Observer {
  constructor(value) {
    this.value = value;
    // 判断⼀下value类型
    // 遍历对象
    this.walk(value);
  }
  walk(obj) {
    Object.keys(obj).forEach((key) => {
      defineReactive(obj, key, obj[key]);
    });
  }
}
class KVue {
  constructor(options) {
    // 0.保存options
    this.$options = options;
    this.$data = options.data;
    // 1.将data做响应式处理
    observe(this.$data);
    // 2.为$data做代理
    proxy(this, "$data");
    // 3.编译模板
    // new Compile('#app', this)

    if (options.el) {
      this.$mount(options.el);
    }
  }

  $mount(selector) {
    this.$el = document.querySelector(selector);
    // 1.updateComponent
    const updateComponent = () => {
      const { render } = this.$options;
      // 追加到parent
      // const parent = this.$el.parentElement;
      // parent.insertBefore(el, this.$el.nextSibling);
      // parent.removeChild(this.$el);
      // this.$el = el;

      // vnode
      const vnode = render.call(this, this.$createElement);
      this._update(vnode);
    };

    // 2.Watcher
    new Watcher(this, updateComponent);
  }

  $createElement(tag, props, children) {
    return { tag, props, children };
  }

  // 转换vnode为dom
  _update(vnode) {
    const prevVnode = this._vnode;

    if (!prevVnode) {
      // init
      this.__patch__(this.$el, vnode);
    } else {
      // update
      this.__patch__(prevVnode, vnode);
    }
  }

  __patch__(oldVnode, vnode) {
    // 1.判断oldVnode是不是真实元素
    if (oldVnode.nodeType) {
      // init
      const parent = oldVnode.parentElement;
      const refElm = oldVnode.nextSibling;
      // 递归创建dom树
      const el = this.createElm(vnode);
      parent.insertBefore(el, refElm);
      parent.removeChild(oldVnode);
    } else {
      // update
      // 1.获取要操作dom
      const el = (vnode.el = oldVnode.el);
      if (oldVnode.tag === vnode.tag) {
        // 相同节点
        // 属性更新
        // todo

        // 子节点更新
        const oldCh = oldVnode.children;
        const newCh = vnode.children;

        if (typeof newCh === "string") {
          if (typeof oldCh === "string") {
            // text update
            if (newCh !== oldCh) {
              el.textContent = newCh;
            }
          } else {
            // text replacement
            el.textContent = newCh;
          }
        } else {
          if (typeof oldCh === "string") {
            // 清空文本，追加子元素
            el.innerHTML = "";
            newCh.forEach((child) => el.appendChild(this.createElm(child)));
          } else {
            // 重排
            this.updateChildren(el, oldCh, newCh);
          }
        }
      } else {
        // replace
      }
    }

    this._vnode = vnode;
  }

  createElm(vnode) {
    const el = document.createElement(vnode.tag);

    // props
    if (vnode.props) {
      for (const key in vnode.props) {
        const value = vnode.props[key];
        el.setAttribute(key, value);
      }
    }

    // children
    if (vnode.children) {
      if (typeof vnode.children === "string") {
        // 文本
        el.textContent = vnode.children;
      } else {
        // 遍历子元素，并转换为dom
        vnode.children.forEach((vnode) => {
          el.appendChild(this.createElm(vnode));
        });
      }
    }

    // vnode和dom之间要建立关系
    vnode.el = el;
    return el;
  }

  updateChildren(parentElm, oldCh, newCh) {
    // 这⾥暂且直接patch对应索引的两个节点
    const len = Math.min(oldCh.length, newCh.length);
    for (let i = 0; i < len; i++) {
      this.__patch__(oldCh[i], newCh[i]);
    }
    // newCh若是更⻓的那个，说明有新增
    if (newCh.length > oldCh.length) {
      newCh.slice(len).forEach((child) => {
        const el = this.createElm(child);
        parentElm.appendChild(el);
      });
    } else if (newCh.length < oldCh.length) {
      // oldCh若是更⻓的那个，说明有删减
      oldCh.slice(len).forEach((child) => {
        parentElm.removeChild(child.el);
      });
    }
  }
}
// 移除
// class Compile {}
class Watcher {
  constructor(vm, updaterFn) {
    this.vm = vm;
    this.getter = updaterFn;

    // 首次调用
    this.get();
  }

  get() {
    // 依赖收集触发
    Dep.target = this;
    this.getter.call(this.vm);
    Dep.target = null;
  }

  update() {
    this.get();
  }
}
// 管家：和某个key，⼀⼀对应，管理多个秘书，数据更新时通知他们做更新⼯作
class Dep {
  constructor() {
    this.deps = new Set();
  }
  addDep(watcher) {
    this.deps.add(watcher);
  }
  notify() {
    this.deps.forEach((watcher) => watcher.update());
  }
}
