
export function callMicroflow(microflowName: string, paramGuids: string[]) {
    return new Promise<string | number | boolean | mendix.lib.MxObject[] | mendix.lib.MxObject | void>
        ((resolve, reject) => {
            mx.data.action({
                params: {
                    actionname: microflowName,
                    guids: paramGuids,
                    applyto: "selection",
                },
                callback: (object) => {
                    resolve(object);
                },
                error: (error) => {
                    reject(error);
                }
            })
        })
}