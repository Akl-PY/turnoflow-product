import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

export type OrderStatus = 'pending' | 'completed' | 'refunded';
export type PaymentGateway = 'stripe' | 'mercadopago' | 'sandbox';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  customerEmail: string;

  @Column({ length: 150 })
  customerName: string;

  @Column({ length: 50, nullable: true })
  customerPhone: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'completed'
  })
  status: OrderStatus;

  @Column({ length: 50, default: 'turnoflow-implementation-kit' })
  planId: string;

  @Column({ type: 'float', default: 49.0 })
  amount: number;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: 'sandbox'
  })
  gateway: PaymentGateway;

  @Column({ length: 150, nullable: true })
  gatewayOrderId: string;

  @Index({ unique: true })
  @Column({ length: 100 })
  downloadToken: string;

  @Column({ default: 0 })
  downloadCount: number;

  @Column({ default: 10 })
  maxDownloads: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
