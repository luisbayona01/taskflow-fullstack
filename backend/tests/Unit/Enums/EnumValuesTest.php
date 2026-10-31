<?php

namespace Tests\Unit\Enums;

use App\Enums\ProjectRole;
use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use PHPUnit\Framework\TestCase;

class EnumValuesTest extends TestCase
{
    public function test_enum_values_match_the_database_definitions(): void
    {
        $this->assertSame(
            ['owner', 'member'],
            array_column(ProjectRole::cases(), 'value')
        );

        $this->assertSame(
            ['pending', 'in_progress', 'done'],
            array_column(TaskStatus::cases(), 'value')
        );

        $this->assertSame(
            ['low', 'medium', 'high'],
            array_column(TaskPriority::cases(), 'value')
        );
    }
}
