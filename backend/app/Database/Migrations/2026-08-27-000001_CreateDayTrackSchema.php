<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateDayTrackSchema extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 120],
            'email' => ['type' => 'VARCHAR', 'constraint' => 254],
            'pending_email' => ['type' => 'VARCHAR', 'constraint' => 254, 'null' => true],
            'password_hash' => ['type' => 'VARCHAR', 'constraint' => 255],
            'email_verified' => ['type' => 'BOOLEAN', 'default' => false],
            'failed_login_attempts' => ['type' => 'TINYINT', 'unsigned' => true, 'default' => 0],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('email');
        $this->forge->addUniqueKey('pending_email');
        $this->forge->createTable('users');

        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'user_id' => ['type' => 'BIGINT', 'unsigned' => true],
            'purpose' => ['type' => 'VARCHAR', 'constraint' => 32],
            'token_hash' => ['type' => 'CHAR', 'constraint' => 64],
            'expires_at' => ['type' => 'DATETIME'],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('token_hash');
        $this->forge->addKey(['user_id', 'purpose']);
        $this->forge->addKey('expires_at');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->createTable('auth_tokens');

        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'user_id' => ['type' => 'BIGINT', 'unsigned' => true],
            'first_name' => ['type' => 'VARCHAR', 'constraint' => 100],
            'last_name' => ['type' => 'VARCHAR', 'constraint' => 100, 'default' => ''],
            'birth_date' => ['type' => 'DATE'],
            'notify_on_birthday' => ['type' => 'BOOLEAN', 'default' => true],
            'notify_days_before' => ['type' => 'SMALLINT', 'unsigned' => true, 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('user_id');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->createTable('birthdays');
    }

    public function down(): void
    {
        $this->forge->dropTable('birthdays', true);
        $this->forge->dropTable('auth_tokens', true);
        $this->forge->dropTable('users', true);
    }
}
