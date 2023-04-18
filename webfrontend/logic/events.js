"use strict";

/**
 * @brief works as a intermidary, to handle automatic unsubscribe
 */
class EventSubscriber {
  dispatcher = null;
  constructor(owner, callback) {
    this.owner = owner;
    this.callback = callback;
    if (!this.owner._subscriptions)
      this.owner._subscriptions = [];
    this.owner._subscriptions.push(this);
  }

  unsubscribe() {
    if (this.dispatcher) {
      this.dispatcher = null;
      this.dispatcher.unsubscribe({subcriber: this});
    }

    const idx = this.owner._subscriptions.indexOf(this);
    if (idx > -1)
      this.owner._subscriptions.splice(idx, 1);
  }
}

class EventDispatcher {
  events = []; // array with strings of event
  _subscribers = [];
  _DOMObserver = null;

  /**
   * @brief all classes that want to use events should create 1
   *        instance of this class for each event they use
   * @param {*} owner the owner class
   * @param {*} monitorNode monitors DOM node, closes event when node is deleted
   */
  constructor(owner, monitorNode = null) {
    this.owner = owner;
    this.monitorNode = monitorNode;
    if (monitorNode) {
      this._DOMObserver = new MutationObserver(
        this._DomNodeChanged.bind(this));
      this._DOMObserver.observe(
        document.body, {subtree:true, childList: true});
    }
  }

  /**
   * @brief add subscriber to this event
   * @param subscriber the EventSubscriber class that forwards event
   */
  subscribe({subscriber, scope = window}) {
    if (!subscriber) {
      if (arguments.length == 2)
        subscriber = new EventSubscriber(arguments[0], arguments[1]);
      else
        console.error("No EventSubscriber in arguments list");
    }
    if (!this._subscribers.find(s=>s.subscriber===subscriber))
      this._subscribers.push({subscriber, scope});
  }

  /**
   * @brief remove subscriber from this event
   * @param {*} param0
   */
  unsubscribe({subscriber = null, callback = null}) {
    if (!subscriber && !callback)
      console.error("Must have one or the other of subcriber or callback");
    const itm = this._subscribers.find(s=>{
      if (subscriber && s.subscriber===subscriber)
        return true;
      return (callback && s.callback===callback);
    });

    if (itm) {
      this._subscribers.splice(this._subscribers.indexOf(itm), 1);
      if (itm.dispatcher === this) // subscriber must reset dispatcher to avoid infinte loop
        itm.unsubscribe();
    }

  }

  emit() {
    for (let {subscriber, scope} of this._subscribers)
      subscriber.callback.apply(scope, arguments);
  }

  /**
   * @brief unregister all subscribers
   */
  close() {
    this._subscribers.forEach(s=>this.unsubscribe({subscriber:s}));
    if (this._DOMObserver)
      this._DOMObserver.disconnect();
  }

  /**
   * @brief called when our monitor node is destroyed, that in turn trigers close()
   */
  _DomNodeChanged(mutationList, observer) {
    // we subscribe to body we need to iterate all possible lists
    mutationList.forEach(list=>{
      list.removedNodes.forEach(n=>{
        if (n.contains(this.monitorNode)) {
          this.close();
          return;
        }
      })
    });
  }
}
