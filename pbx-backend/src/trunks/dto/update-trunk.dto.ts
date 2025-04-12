import { PartialType } from '@nestjs/mapped-types';
import { CreateTrunkDto } from './create-trunk.dto';

export class UpdateTrunkDto extends PartialType(CreateTrunkDto) {
  // Thêm các thuộc tính cần thiết cho việc cập nhật trunk
  // Ví dụ:
  // name?: string;
  // type?: string;
  // host?: string;
  // username?: string;
  // password?: string;
}
