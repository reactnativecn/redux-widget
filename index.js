import * as React from "react";
import { connect } from "react-redux";
import { createAction, Action } from "redux-actions";
import { Map } from "immutable";
const hoistStatics = require("hoist-non-react-statics");

let idCounter = 0;
function genKey(name) {
  let key = (++idCounter).toString(36);
  if (__DEV__) {
    return `${name}-${key}`;
  }
  return key;
}

const widgetInstanceType = {};

function mapStateToProps(state, { widgetKey }) {
  return { widgetState: state.widgetState.get(widgetKey) };
}

function mapStateToPropsWithSelector(selector) {
  return (state, { widgetKey }) => {
    return {
      widgetState: state.widgetState.get(widgetKey),
      ...selector(state)
    };
  };
}

function mapDispatchToProps(actions) {
  return function(dispatch, { widgetKey }) {
    const ret = { dispatch };
    for (const key of Object.keys(actions)) {
      const actionCreator = actions[key];
      ret[key] = (...args) =>
        dispatch({ ...actionCreator(...args), widgetKey });
    }
    return ret;
  };
}

function noop(state) {
  return state;
}

export const INIT = "@@Widget/INIT";
export const init = createAction(INIT);

export const UNLOAD = "@@Widget/UNLOAD";
export const unload = createAction(UNLOAD);

// 用来包装一个widget，替代connect，并提供widgetKey和widgetState属性。
// actions 可以包含local actions或全局actions，但发出的action都会有widgetKey字段。
export function widget(reducer = noop, actions = {}, selector) {
  return function(Comp) {
    const name = Comp.displayName || Comp.name;
    if (!name) {
      throw new Error("Component must have a name");
    }

    const ConnectedComp = connect(
      selector ? mapStateToPropsWithSelector(selector) : mapStateToProps,
      actions && mapDispatchToProps(actions)
    )(Comp);

    const Wrapped = class WrappedWidget extends React.Component {
      widgetKey = genKey(name);

      constructor(props) {
        super(props);

        widgetInstanceType[this.widgetKey] = reducer;

        const { dispatch } = this.props;
        if (dispatch) {
          dispatch({ ...init(), widgetKey: this.widgetKey });
        }
      }
      componentWillUnmount() {
        const { dispatch } = this.props;
        if (dispatch) {
          dispatch({ ...unload(), widgetKey: this.widgetKey });
        }
        delete widgetInstanceType[this.widgetKey];
      }
      render() {
        const { dispatch, ...others } = this.props;
        return <ConnectedComp {...others} widgetKey={this.widgetKey} />;
      }
    };

    const ret = connect()(Wrapped);
    hoistStatics(ret, Comp);
    return ret;
  };
}

// 核心reducer，用来清空移除的widget或分发事件到对应的reducer
export default function reducer(state, action) {
  const { widgetKey } = action;
  state = state || Map();
  if (widgetKey) {
    if (widgetKey === "*") {
      for (const key of state.keySeq().toArray()) {
        const widgetState = state.get(key);
        const reducer = widgetInstanceType[key];
        const nextState = reducer(widgetState, action);

        state = state.set(key, nextState);
      }
    } else {
      const widgetState = state.get(widgetKey);
      const reducer = widgetInstanceType[widgetKey];
      const nextState = reducer(widgetState, action);

      if (action.type === UNLOAD) {
        state = state.delete(widgetKey);
      } else {
        state = state.set(widgetKey, nextState);
      }
    }
  }
  return state;
}
