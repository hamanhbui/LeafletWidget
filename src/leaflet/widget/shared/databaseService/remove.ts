export function remove(guid: string) {
    return new Promise<void>((resolve, reject) => {
        mx.data.remove({
            guid: guid,
            callback: () => {
                resolve();
            },
            error: (e) => {
                reject(e);
                console.log(e);
            }
        })
    })
}