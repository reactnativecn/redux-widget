import { call, take, getContext, setContext } from "redux-saga/effects";

function localRule(key, rule) {
  if (!rule || rule === "*") {
    return action => action.widgetKey === key || action.widgetKey === "*";
  }
  if (typeof rule === "function") {
    if (rule.hasOwnProperty("toString")) {
      rule = rule.toString();
    } else {
      return action =>
        (action.widgetKey === key || action.widgetKey === "*") && rule(action);
    }
  }
  if (Array.isArray(rule)) {
    return rule.map(v => localRule(key, v));
  }
  return action => {
    return (
      (action.widgetKey === key || action.widgetKey === "*") &&
      action.type === rule
    );
  };
}

export function takeInWidget(rule) {
  return call(function*() {
    const key = yield getContext("widgetKey");
    return yield take(localRule(key, rule));
  });
}

export function takeEveryInWidget(rule, worker, ...args) {
  return call(function*() {
    const key = yield getContext("widgetKey");
    return yield takeEvery(localRule(key, rule), worker, ...args);
  });
}

export function takeLatestInWidget(rule, worker, ...args) {
  return call(function*() {
    const key = yield getContext("widgetKey");
    return yield takeLatest(localRule(key, rule), worker, ...args);
  });
}

export function putInWidget(action, widgetKey) {
  if (widgetKey) {
    return put({ ...action, widgetKey });
  }
  return call(function*() {
    const widgetKey = yield getContext("widgetKey");
    return yield put({ ...action, widgetKey });
  });
}

export function putToAllWidgets(action) {
  return put({ ...action, widgetKey: "*" });
}
