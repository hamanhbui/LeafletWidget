export function openForm(path: string, object: mendix.lib.MxObject, title?: string) {
    let context = new mendix.lib.MxContext;
    context.setTrackObject(object);
    context.setContext(object.getEntity(), object.getGuid())
    return new Promise((resolve, reject) => {
        if (!path) {
            resolve();
            return;
        }
        mx.ui.openForm(path, {
            location: "modal",
            title: title,
            callback: (form) => {
                resolve(form);
                let unlistener = form.listen("rollback", () => {
                    form["close"]();
                    form.unlisten(unlistener);
                })
            },
            error: (e) => {
                console.log(e);
                reject(e)
            },
            context: context,
        })
    })
}