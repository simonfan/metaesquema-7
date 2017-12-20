
function Loop(items, startAt) {
	this.items = items
	this.lastIndex = items.length - 1
	this.nextIndex = startAt || 0
}

Loop.prototype.next = function () {
	let item = this.items[this.nextIndex]
	this.nextIndex = this.nextIndex >= this.lastIndex ? 0 : this.nextIndex + 1

	return item
}

Loop.prototype.random = function () {
	return this.items[Math.floor(Math.random() * this.items.length)]
}

exports.Loop = Loop
