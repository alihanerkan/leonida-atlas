<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_members_are_sent_to_their_personal_atlas()
    {
        $this->actingAs(User::factory()->create(['locale' => 'tr']));

        $this->get('/dashboard')->assertRedirect('/tr/atlasim');
    }

    public function test_staff_are_sent_to_the_admin_dashboard()
    {
        $this->actingAs(User::factory()->role('editor')->create());

        $this->get('/dashboard')->assertRedirect('/admin');
    }
}
