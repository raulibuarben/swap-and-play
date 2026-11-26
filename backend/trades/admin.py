from django.contrib import admin
from .models import Trade

# Register your models here.
@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'target_game',
        'requester',
        'offer_type',
        'offered_game',
        'offered_price',
        'status',
        'created_at',
    )
    list_filter = ('offer_type', 'status', 'created_at')
    search_fields = ('target_game__title', 'requester__username', 'offered_game__title')