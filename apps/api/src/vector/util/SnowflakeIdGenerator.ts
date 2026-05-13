export class SnowflakeIdGenerator {
	private static readonly EPOCH = 1704067200000n;
	private static readonly WORKER_ID_BITS = 10n;
	private static readonly SEQUENCE_BITS = 12n;
	private static readonly MAX_SEQUENCE = (1n << SnowflakeIdGenerator.SEQUENCE_BITS) - 1n;

	private lastTimestamp = -1n;
	private sequence = 0n;

	constructor(private readonly workerId: bigint) {}

	nextId() {
		let timestamp = BigInt(Date.now());

		if (timestamp === this.lastTimestamp) {
			this.sequence = (this.sequence + 1n) & SnowflakeIdGenerator.MAX_SEQUENCE;
			if (this.sequence === 0n) {
				while (BigInt(Date.now()) <= timestamp) {
					// wait for next millisecond to avoid duplicate ids in the same time slot
				}
				timestamp = BigInt(Date.now());
			}
		} else {
			this.sequence = 0n;
		}

		this.lastTimestamp = timestamp;
		const id =
			((timestamp - SnowflakeIdGenerator.EPOCH) <<
				(SnowflakeIdGenerator.WORKER_ID_BITS + SnowflakeIdGenerator.SEQUENCE_BITS)) |
			(this.workerId << SnowflakeIdGenerator.SEQUENCE_BITS) |
			this.sequence;

		return id.toString();
	}
}
