(function(global){
'use strict';
const App = global.App;

const Router = {
  defaultId: null,

  parse(){
    const raw = (location.hash || '').replace(/^#\/?/, '').trim();
    const id = raw.split('/')[0];
    return App._pages[id] ? id : this.defaultId;
  },

   start(defaultId){
    this.defaultId = defaultId;

    if(!location.hash){
      location.replace('#' + defaultId);
    }

    window.addEventListener('hashchange', () => this._run());
    this._run();
  },

  _run(){
    const id = this.parse();
    if(id && id !== App._current) App._activate(id);
  },

  go(id){
    if(location.hash === '#' + id) App._activate(id);
    else location.hash = '#' + id;
  }
};

global.Router = Router;
})(window);