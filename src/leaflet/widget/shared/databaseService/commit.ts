export function commit(object: mendix.lib.MxObject): Promise<Object> {
    return new Promise((resolve, reject) => {
        mx.data.commit({
            mxobj: object,
            callback: () => {
                resolve(object);
                console.log("Successfully commit to server");
            },
            error: (e) => {
                reject(e);
                console.log(e);
            }
        })
    })

}
