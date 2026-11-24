from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.
class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    biography = models.TextField(max_length=500, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    completed_trades = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.username