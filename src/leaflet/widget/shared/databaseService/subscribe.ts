export function subscribe(guid: string, callback) {
    mx.data.subscribe({
        guid: guid,
        callback: callback
    })
} 