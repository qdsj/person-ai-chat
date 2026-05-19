import { User } from "src/auth/entities/user.entity";
import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from "typeorm";

@Entity("upload_records")
@Index(["userId", "createdAt"])
export class UploadRecord {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ name: "user_id", type: "int" })
	userId: number;

	@ManyToOne(() => User, (user) => user.uploadRecords, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "user_id" })
	user: User;

	@Column({ name: "object_key", length: 1024 })
	objectKey: string;

	@Column({ name: "original_name", length: 255 })
	originalName: string;

	@Column({ name: "mime_type", length: 255 })
	mimeType: string;

	@Column({ type: "bigint" })
	size: number;

	@Column({ length: 2048, default: "" })
	url: string;

	@Column({ type: "varchar", length: 20 })
	source: "file" | "text";

	@CreateDateColumn({ name: "created_at", type: "datetime" })
	createdAt: Date;
}
