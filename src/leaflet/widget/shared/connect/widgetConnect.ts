import connect = require("dojo/_base/connect");

/**
 * Layer on top of dojo connect to add widgetid to the topic to mimic local events.
 * Can also create children to have on smaller scope for handle destruction.
 * Child connect objects are meant to be used to contain for exmpale only edit mode
 * handles so one can create/destroy edit handles easily.
 */
export class WidgetConnect {
    /** All handles registered by this widget connect */
    private registeredHandles: any[] = [];
    /** All children of this widgetconnect */
    private childConnect: WidgetConnect[] = [];
    /** The parent (if applicable) if this widgetconnect is a child */
    private parentConnect: WidgetConnect | null = null;

    /**
     * Initialize this widgetconnect for this widgetid.
     */
    constructor(
        private widgetId: string) {
    }
    /**
     * Prefix the widget id to this topic to scope it only to this widget.
     */
    private addWidgetIdToTopic(topic: string): string {
        return this.widgetId + topic;
    }

    /**
     * Subscribe for this topic with this method.
     * @param topic a topic string
     * @param context the this object in the function to be called
     * @param method a string or function that represents a function
     * (if string than make sure there is a funcion named like that in the context object)
     * @return a handle to be used to unsubscribe
     */
    public subscribe(topic: string, context: Object, method: Function): any {
        let handle: any = null;
        let widgetTopic: string = this.addWidgetIdToTopic(topic);

        handle = connect.subscribe(widgetTopic, context, <any>method);

        if (handle != null) {
            this.registeredHandles.push(handle);
        }

        return handle;
    }

    /**
     * Unsubscribe this handle for receiving events.
     */
    public unsubscribe(handle: any) {
        connect.unsubscribe(handle);
        let indexOfHandle: number = this.registeredHandles.indexOf(handle);
        if (indexOfHandle > -1) {
            this.registeredHandles.splice(indexOfHandle, 1);
        }
    }

    /**
     * Publish event on this topic containing this data.
     * @param topic the topic
     * @param data the data to publish
     */
    public publish(topic: string, data: any[] = []) {
        connect.publish(this.addWidgetIdToTopic(topic), data);
    }
    /**
     * Create a child connect object for this connect.
     * When the parent connect object is destroyed it will also destroy its children.
     * When a child is destroyed itself than it will deregister with its parent.
     * Child connect objects are meant to be used to contain for exmpale only edit mode
     * handles so one can create/destroy edit handles easily.
     * @returns {WidgetConnect} child instance of widgetconnect in the same widget scope
     */
    public createChildConnect() {
        let childConnect: WidgetConnect = new WidgetConnect(this.widgetId);
        this.childConnect.push(childConnect);
        childConnect.parentConnect = this;
        return childConnect;
    }
    /**
     * Remove from children array, only call this from child code.
     */
    private deregisterChildConnect(childConnect: WidgetConnect) {
        let indexOfChild: number = this.childConnect.indexOf(childConnect);
        if (indexOfChild > -1) {
            this.childConnect.splice(indexOfChild, 1);
        }
    }

    /**
     * Destroys all listeners subscribed through this object, if this is done in the widget itself than
     * other components do not have to bother with remembering handles.
     */
    public destroy() {
        this.registeredHandles.forEach(handle => connect.unsubscribe(handle));

        let tempChildConnect: WidgetConnect[] = this.childConnect;
        tempChildConnect.forEach(subscope => subscope.destroy());

        if (this.parentConnect !== null) {
            this.parentConnect.deregisterChildConnect(this);
        }
    }
    public subscribeEvents(events: {
        topic: string,
        context?: Object,
        method?: Function,
    }[]) {
        return events.map(event => this.subscribe(event.topic, event.context, event.method));
    }
}
