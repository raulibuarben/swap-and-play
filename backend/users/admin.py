from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "city", "completed_trades", "is_staff")

    fieldsets = UserAdmin.fieldsets + (
        (
            "Swap&Play Profile",
            {"fields": ("city", "biography", "avatar", "completed_trades")},
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Swap&Play Profile",
            {"fields": ("email", "city", "biography", "avatar", "completed_trades")},
        ),
    )