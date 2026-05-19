import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { UploadRecord } from "src/upload/entities/upload-record.entity";

@Entity("users")
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Index({ unique: true })
	@Column({ length: 255 })
	email: string;

	@Column({ name: "password_hash", length: 255 })
	passwordHash: string;

	@Column({ type: "varchar", length: 100, nullable: true })
	name: string | null;

	@OneToMany(() => UploadRecord, (uploadRecord) => uploadRecord.user)
	uploadRecords: UploadRecord[];

	@CreateDateColumn({ name: "created_at", type: "datetime" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "datetime" })
	updatedAt: Date;
}
