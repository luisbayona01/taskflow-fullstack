<?php

namespace App\Enums;

enum ProjectRole: string
{
    case Owner = 'owner';
    case Member = 'member';
}
