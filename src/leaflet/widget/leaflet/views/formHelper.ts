/// <reference path="../../../../../typings/index.d.ts" />
export class FormHelper {
    private parentNode: HTMLElement;
    private contextObject: mendix.lib.MxObject;
    private path: string;
    public openForm(contextObject: mendix.lib.MxObject, path: string) {
        this.parentNode = document.getElementById("formId")!;
        this.cleanForm();
        this.contextObject = contextObject;
        this.path = path;
        let context = new mendix.lib.MxContext;
        context.setTrackObject(this.contextObject);
        context.setContext(this.contextObject.getEntity(), this.contextObject.getGuid());
        return new Promise((resolve, reject) => {
            if (!this.path) {
                resolve();
                return;
            }
            mx.ui.openForm(this.path, {
                domNode: this.parentNode,
                callback: (form) => {
                    document.getElementById("formId")!.style.display = "block";
                    resolve(form);
                    let unlistener = form.listen("rollback", () => {
                        form["close"]();
                        form.unlisten(unlistener);
                    })
                    const domNode = form.domNode;
                },
                error: (e) => {
                    console.log(e);
                    reject(e)
                },
                context: context,
            })
        })
    }
    public cleanForm() {
        this.parentNode = document.getElementById("formId")!;
        while (this.parentNode && this.parentNode.hasChildNodes()) {
            this.parentNode.removeChild(this.parentNode.firstChild!);
        }
        this.parentNode.style.display = "none";
    }
    public destroy() {
        this.cleanForm();
        delete this.contextObject;
        delete this.path;
        delete this.parentNode;
    }
}
